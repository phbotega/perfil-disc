import { and, eq } from "drizzle-orm";
import { banco } from "@/db";
import { leads, resultados, respostas, sessoes } from "@/db/schema";
import { produzirResultado } from "@/lib/core/relatorio";
import { montarRelatorioGratuito, normalizarEmail, type RelatorioGratuito } from "@/lib/core/relatorio-gratis";
import { calcularItp } from "@/lib/core/itp";
import type { ItpClassificacao, ResultadoPerfil, Simbolo } from "@/lib/core/tipos";
import { lerNormasVigentes } from "./normas";
import { statusAposCaptura } from "./sessoes";

const TOTAL_ITENS = 64;

export interface EntradaCaptura {
  sessaoId: string;
  email: string;
  telefone?: string;
  nome?: string;
  consentimentoLgpd: boolean;
  consentimentoMarketing: boolean;
}

export class ErroValidacaoCaptura extends Error {}

/** Monta RespostaBruta a partir das linhas persistidas, deduplicando por item (última vence). */
async function respostasBrutasDaSessao(sessaoId: string): Promise<
  { itemCodigo: string; simbolo: Simbolo; tempoMs: number }[]
> {
  const linhas = await banco()
    .select({
      itemCodigo: respostas.itemCodigo,
      simbolo: respostas.simbolo,
      tempoMs: respostas.tempoMs,
    })
    .from(respostas)
    .where(eq(respostas.sessaoId, sessaoId));
  return linhas.map((l) => ({ itemCodigo: l.itemCodigo, simbolo: l.simbolo as Simbolo, tempoMs: l.tempoMs }));
}

function resultadoDeLinhas(
  linhas: { itemCodigo: string; simbolo: Simbolo; tempoMs: number }[],
  normas?: Parameters<typeof produzirResultado>[1],
): ResultadoPerfil {
  const unicos = new Map<string, { simbolo: Simbolo; tempoMs: number }>();
  for (const l of linhas) unicos.set(l.itemCodigo, { simbolo: l.simbolo, tempoMs: l.tempoMs });
  if (unicos.size !== TOTAL_ITENS) {
    throw new ErroValidacaoCaptura(
      `questionario_incompleto: ${unicos.size}/${TOTAL_ITENS} itens respondidos`,
    );
  }
  const brutas = [...unicos.entries()].map(([itemId, r]) => ({
    itemId,
    simbolo: r.simbolo,
    tempoMs: r.tempoMs,
  }));
  return produzirResultado(brutas, normas);
}

/** Reconstitui ResultadoPerfil a partir da linha persistida. */
export function resultadoDaLinha(linha: {
  dominante: string;
  secundario: string | null;
  perfilCombinado: boolean;
  padraoCodigo: string;
  padraoNome: string;
  itp: number;
  itpClassificacao: string;
  normaProvisoria: boolean;
  baseJson: any;
  expectativaJson: any;
  deltasJson: any;
  qualidadeJson: any;
}): ResultadoPerfil {
  const base = linha.baseJson as ResultadoPerfil["escoresBase"];
  const expectativa = linha.expectativaJson as ResultadoPerfil["escoresExpectativa"];
  return {
    escoresBase: base,
    escoresExpectativa: expectativa,
    normaProvisoria: linha.normaProvisoria,
    dominante: linha.dominante as ResultadoPerfil["dominante"],
    secundario: linha.secundario as ResultadoPerfil["secundario"],
    perfilCombinado: linha.perfilCombinado,
    padraoCodigo: linha.padraoCodigo,
    padraoNome: linha.padraoNome,
    deltas: linha.deltasJson as ResultadoPerfil["deltas"],
    itp: linha.itp,
    itpClassificacao: linha.itpClassificacao as ItpClassificacao,
    deltaDirecoes: calcularItp(base, expectativa).direcoes,
    qualidade: linha.qualidadeJson as ResultadoPerfil["qualidade"],
  };
}

export interface ResultadoCaptura {
  leadId: string;
  relatorio: RelatorioGratuito;
  resultado: ResultadoPerfil;
}

/**
 * Registra a captura (lead com consentimento) e persiste o resultado das 64
 * respostas. É idempotente: se já existir resultado, devolve o armazenado.
 */
export async function registrarCapturaEresultado(
  entrada: EntradaCaptura,
): Promise<ResultadoCaptura> {
  const db = banco();
  const email = normalizarEmail(entrada.email);

  const [sessao] = await db
    .select({ id: sessoes.id, status: sessoes.status, nome: sessoes.nome })
    .from(sessoes)
    .where(eq(sessoes.id, entrada.sessaoId))
    .limit(1);
  if (!sessao) throw new ErroValidacaoCaptura("sessao_nao_encontrada");

  const existente = await db
    .select()
    .from(resultados)
    .where(eq(resultados.sessaoId, entrada.sessaoId))
    .limit(1);
  if (existente[0]) {
    const resultado = resultadoDaLinha(existente[0]);
    const lead = await db
      .select({ id: leads.id })
      .from(leads)
      .where(eq(leads.sessaoId, entrada.sessaoId))
      .limit(1);
    return {
      leadId: lead[0]?.id ?? "",
      relatorio: montarRelatorioGratuito(resultado),
      resultado,
    };
  }

  const linhas = await respostasBrutasDaSessao(entrada.sessaoId);
  const normasVigentes = await lerNormasVigentes();
  const resultadoFinal = resultadoDeLinhas(linhas, normasVigentes);

  const agora = new Date();
  const [lead] = await db
    .insert(leads)
    .values({
      sessaoId: entrada.sessaoId,
      nome: entrada.nome?.trim() || sessao.nome || null,
      email,
      telefone: entrada.telefone?.trim() || null,
      consentimentoLgpdEm: agora,
      consentimentoMarketing: entrada.consentimentoMarketing,
      relatorioGratuitoEm: agora,
    })
    .onConflictDoUpdate({
      target: leads.sessaoId,
      set: {
        nome: entrada.nome?.trim() || sessao.nome || null,
        email,
        telefone: entrada.telefone?.trim() || null,
        consentimentoMarketing: entrada.consentimentoMarketing,
        relatorioGratuitoEm: agora,
      },
    })
    .returning({ id: leads.id });

  const r = resultadoFinal;
  await db
    .insert(resultados)
    .values({
      sessaoId: entrada.sessaoId,
      dominante: r.dominante,
      secundario: r.secundario,
      perfilCombinado: r.perfilCombinado,
      padraoCodigo: r.padraoCodigo,
      padraoNome: r.padraoNome,
      itp: Math.round(r.itp),
      itpClassificacao: r.itpClassificacao,
      normaProvisoria: r.normaProvisoria,
      baseJson: r.escoresBase,
      expectativaJson: r.escoresExpectativa,
      deltasJson: r.deltas,
      qualidadeJson: r.qualidade,
    })
    .onConflictDoUpdate({
      target: resultados.sessaoId,
      set: {
        dominante: r.dominante,
        secundario: r.secundario,
        perfilCombinado: r.perfilCombinado,
        padraoCodigo: r.padraoCodigo,
        padraoNome: r.padraoNome,
        itp: Math.round(r.itp),
        itpClassificacao: r.itpClassificacao,
        normaProvisoria: r.normaProvisoria,
        baseJson: r.escoresBase,
        expectativaJson: r.escoresExpectativa,
        deltasJson: r.deltas,
        qualidadeJson: r.qualidade,
      },
    });

  await db
    .update(sessoes)
    .set({ status: statusAposCaptura(sessao.status as any), concluidaEm: agora, atualizadaEm: agora })
    .where(and(eq(sessoes.id, entrada.sessaoId)));

  return {
    leadId: lead.id,
    relatorio: montarRelatorioGratuito(resultadoFinal),
    resultado: resultadoFinal,
  };
}

/** Relatório já persistido para retomada (null se ainda não capturado). */
export async function relatorioDeSessao(sessaoId: string): Promise<RelatorioGratuito | null> {
  const linhas = await banco()
    .select()
    .from(resultados)
    .where(eq(resultados.sessaoId, sessaoId))
    .limit(1);
  if (!linhas[0]) return null;
  return montarRelatorioGratuito(resultadoDaLinha(linhas[0]));
}