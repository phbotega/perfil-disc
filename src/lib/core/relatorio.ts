import { obterItem } from "./banco";
import { resolverPadrao } from "./dominancia";
import { calcularEscores, processarRespostas } from "./escore";
import { calcularItp } from "./itp";
import { normasProvisorias } from "./normas";
import type { Normas } from "./normas";
import { nomeDoPadrao } from "./padroes";
import { avaliarQualidade } from "./qualidade";
import { FATORES } from "./tipos";
import type { RespostaBruta, ResultadoPerfil } from "./tipos";

/**
 * Pipeline completo: respostas brutas -> perfil escorado.
 * - valida que as 64 respostas estejam presentes (32 por contexto);
 * - normaliza com a norma vigente (provisória até N >= 500);
 * - resolve dominância, padrão combinado, ITP e controles de qualidade.
 */
export function produzirResultado(
  respostas: RespostaBruta[],
  normas: Normas = normasProvisorias(),
): ResultadoPerfil {
  const processadas = processarRespostas(respostas);
  if (processadas.length !== 64) {
    throw new Error(
      `Resultado exige exatamente 64 respostas (recebidas: ${processadas.length}).`,
    );
  }

  const { base, expectativa } = calcularEscores(processadas, normas);

  const padrao = resolverPadrao(base, expectativa);
  const itp = calcularItp(base, expectativa);

  const deltas = {} as ResultadoPerfil["deltas"];
  for (const fator of FATORES) deltas[fator] = itp.deltas[fator];

  const qualidade = avaliarQualidade(processadas);

  return {
    escoresBase: base,
    escoresExpectativa: expectativa,
    normaProvisoria: normas.provisoria,
    dominante: padrao.dominante,
    secundario: padrao.secundario,
    perfilCombinado: padrao.perfilCombinado,
    padraoCodigo: padrao.codigo,
    padraoNome: nomeDoPadrao(padrao.codigo),
    deltas,
    itp: itp.itp,
    itpClassificacao: itp.classificacao,
    deltaDirecoes: itp.direcoes,
    qualidade,
  };
}

/** Helper para montar RespostaBruta de forma declarativa em testes. */
export function responder(
  itemId: string,
  simbolo: RespostaBruta["simbolo"],
  tempoMs = 4000,
): RespostaBruta {
  return { itemId, simbolo, tempoMs };
}

export function contextoDeItem(itemId: string): "base" | "expectativa" {
  return obterItem(itemId).contexto;
}