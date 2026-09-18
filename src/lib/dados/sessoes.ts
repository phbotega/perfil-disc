import { and, eq } from "drizzle-orm";
import { banco } from "@/db";
import { empresas, respostas, sessoes } from "@/db/schema";
import type { sessoes as sessoesTipo } from "@/db/schema";
import { obterContexto, obterItem } from "@/lib/core/banco";
import { valorBrutoDeSimbolo, valorComputado } from "@/lib/core/escala";
import { ordemDaSessao } from "@/lib/core/ordem";
import type { Contexto, Fator, Simbolo } from "@/lib/core/tipos";

export type StatusSessao =
  | "iniciada"
  | "base"
  | "transicao"
  | "expectativa"
  | "capturada"
  | "paga"
  | "concluida"
  | "abandonada";

const STATUS_FINAL = new Set<StatusSessao>(["paga", "concluida", "abandonada"]);

export interface DadosNovaSessao {
  nome?: string;
  identidade?: string;
  origem?: string;
  dispositivo?: string;
  codigoEmpresa?: string;
}

/**
 * Progressão de status apenas em direção adiante. O botão de voltar permite
 * revisar itens já respondidos; o status reflete o ponto mais avançado que a
 * sessão já alcançou, nunca regride.
 */
export function novoStatus(
  contexto: Contexto,
  statusAtual: StatusSessao,
): StatusSessao {
  if (contexto === "base") {
    return statusAtual === "iniciada" ? "base" : statusAtual;
  }
  return statusAtual === "base" || statusAtual === "transicao"
    ? "expectativa"
    : statusAtual;
}

export async function criarSessao(dados: DadosNovaSessao = {}) {
  const db = banco();
  let empresaId: string | null = null;
  if (dados.codigoEmpresa?.trim()) {
    const empresa = await db
      .select({ id: empresas.id })
      .from(empresas)
      .where(eq(empresas.codigo, dados.codigoEmpresa.trim()))
      .limit(1);
    empresaId = empresa[0]?.id ?? null;
  }
  const [sessao] = await db
    .insert(sessoes)
    .values({
      nome: dados.nome?.trim() || null,
      identidade: dados.identidade?.trim() || null,
      origem: dados.origem || null,
      dispositivo: dados.dispositivo || null,
      empresaId,
      status: "iniciada",
    })
    .returning();
  return sessao;
}

export async function salvarResposta(
  sessaoId: string,
  entrada: { itemCodigo: string; simbolo: Simbolo; tempoMs: number },
) {
  const db = banco();
  const [sessao] = await db
    .select({ id: sessoes.id, status: sessoes.status })
    .from(sessoes)
    .where(eq(sessoes.id, sessaoId))
    .limit(1);
  if (!sessao) throw new Error("sessao_nao_encontrada");

  const item = obterItem(entrada.itemCodigo);
  const statusAtual = sessao.status as StatusSessao;
  const permitido =
    item.contexto === "base"
      ? !STATUS_FINAL.has(statusAtual)
      : statusAtual === "transicao" || statusAtual === "expectativa";
  if (!permitido) {
    throw new Error("resposta_fora_de_contexto");
  }

  const valorBruto = valorBrutoDeSimbolo(entrada.simbolo);
  const valorComp = valorComputado(valorBruto, item.reverso);

  const proximoStatus = novoStatus(item.contexto, statusAtual);
  if (proximoStatus !== statusAtual) {
    await db
      .update(sessoes)
      .set({ status: proximoStatus, atualizadaEm: new Date() })
      .where(eq(sessoes.id, sessaoId));
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(respostas)
      .values({
        sessaoId,
        itemCodigo: item.id,
        contexto: item.contexto,
        fator: item.fator,
        simbolo: entrada.simbolo,
        valorBruto,
        valorComputado: valorComp,
        reverso: item.reverso,
        tempoMs: Math.max(0, Math.round(entrada.tempoMs)),
      })
      .onConflictDoUpdate({
        target: [respostas.sessaoId, respostas.itemCodigo],
        set: {
          simbolo: entrada.simbolo,
          valorBruto,
          valorComputado: valorComp,
          tempoMs: Math.max(0, Math.round(entrada.tempoMs)),
          respondidaEm: new Date(),
        },
      });
  });

  const total = await db
    .select({ id: respostas.id })
    .from(respostas)
    .where(eq(respostas.sessaoId, sessaoId));

  return { itemCodigo: item.id, contador: total.length, status: proximoStatus };
}

export async function marcarTransicao(sessaoId: string) {
  const db = banco();
  await db
    .update(sessoes)
    .set({ status: "transicao", atualizadaEm: new Date() })
    .where(and(eq(sessoes.id, sessaoId), eq(sessoes.status, "base")));
}

export interface SessaoCarregada {
  sessao: typeof sessoesTipo.$inferSelect;
  respostas: {
    itemCodigo: string;
    simbolo: Simbolo;
    contexto: Contexto;
    fator: Fator;
    valorComputado: number;
  }[];
  plano: Record<Contexto, string[]>;
}

export async function obterSessaoComPlano(sessaoId: string): Promise<SessaoCarregada | null> {
  const db = banco();
  const [sessao] = await db
    .select()
    .from(sessoes)
    .where(eq(sessoes.id, sessaoId))
    .limit(1);
  if (!sessao) return null;

  const linhas = await db
    .select({
      itemCodigo: respostas.itemCodigo,
      simbolo: respostas.simbolo,
      contexto: respostas.contexto,
      fator: respostas.fator,
      valorComputado: respostas.valorComputado,
    })
    .from(respostas)
    .where(eq(respostas.sessaoId, sessaoId));

  return {
    sessao,
    respostas: linhas.map((l) => ({
      itemCodigo: l.itemCodigo,
      simbolo: l.simbolo as Simbolo,
      contexto: l.contexto,
      fator: l.fator,
      valorComputado: l.valorComputado,
    })),
    plano: ordemDaSessao(sessaoId),
  };
}

export async function obterPlano(sessaoId: string) {
  return ordemDaSessao(sessaoId);
}

/** Uso interno de validação — contexto do item num código. */
export function contextoDeItemCodigo(itemCodigo: string): Contexto {
  return obterContexto(itemCodigo);
}