import { desvioPadrao, pearson } from "./estatistica";
import { FATORES } from "./tipos";
import type {
  RespostaItem,
  ResultadoQualidade,
  SinalQualidade,
} from "./tipos";

export const LIMIAR_DESVIO_PADRAO = 0.5;
export const LIMIAR_TEMPO_ITEM_MS = 1500;
export const LIMIAR_FRACAO_APRESSADA = 0.3;
export const LIMIAR_FRACAO_EXTREMA = 0.75;
export const LIMIAR_MONOTONIA = 0.9;
export const LIMIAR_SATURACAO_CONCORDANCIA = 0.7;
export const LIMIAR_AQUIESCENCIA_R = 0.4;
export const LIMIAR_RECORDACAO_FEEDBACK = 0.25;

const SIMBOLOS_EXTREMOS = new Set(["++", "--"]);
const SIMBOLOS_CONCORDANCIA = new Set(["++", "+"]);
const SIMBOLOS_DISCORDANCIA = new Set(["-", "--"]);

/**
 * Sinal: ausência de feedback. Não invalida o perfil; distingue
 * "ambiente alinhado" de "pessoa isolada" na leitura de ITP baixo.
 * A recordação é medida sobre valores brutos (antes da inversão de
 * reversos), para que os itens reversos não contaminem o contador.
 */
function fracaoRecordacaoFeedback(processadas: RespostaItem[]): number {
  const bloco = processadas.filter((r) => r.contexto === "expectativa");
  if (bloco.length === 0) return 0;
  const concordados = bloco.filter((r) =>
    SIMBOLOS_CONCORDANCIA.has(r.simbolo),
  ).length;
  return concordados / bloco.length;
}

/** Correlação agregada entre itens diretos e reversos do mesmo fator. */
function aquiescenciaDiretoReverso(processadas: RespostaItem[]): number | null {
  const correlacoes: number[] = [];
  for (const fator of FATORES) {
    const diretos = processadas
      .filter((r) => r.fator === fator && !r.reverso)
      .map((r) => r.valorComputado);
    const reversos = processadas
      .filter((r) => r.fator === fator && r.reverso)
      .map((r) => r.valorComputado);
    const parDiretos = reversos.map((_, idx) => diretos[idx] ?? diretos[0]);
    const r = pearson(parDiretos, reversos);
    if (r !== null) correlacoes.push(r);
  }
  if (correlacoes.length === 0) return null;
  return correlacoes.reduce((a, b) => a + b, 0) / correlacoes.length;
}

/** Sinal: tendência a concordar (ou discordar) com tudo, A = concordâncias - discordâncias. */
function saturacaoConcordancia(processadas: RespostaItem[]): number {
  if (processadas.length === 0) return 0;
  let acc = 0;
  for (const r of processadas) {
    if (SIMBOLOS_CONCORDANCIA.has(r.simbolo)) acc += 1;
    else if (SIMBOLOS_DISCORDANCIA.has(r.simbolo)) acc -= 1;
  }
  return acc / processadas.length;
}

export function avaliarQualidade(processadas: RespostaItem[]): ResultadoQualidade {
  const valores = processadas.map((r) => r.valorComputado);
  const desvio = desvioPadrao(valores);

  const fracaoApressada =
    processadas.filter((r) => r.tempoMs < LIMIAR_TEMPO_ITEM_MS).length /
    processadas.length;

  const fracaoExtrema =
    processadas.filter((r) => SIMBOLOS_EXTREMOS.has(r.simbolo)).length /
    processadas.length;

  const contagemSimbolos = new Map<string, number>();
  for (const r of processadas) {
    contagemSimbolos.set(r.simbolo, (contagemSimbolos.get(r.simbolo) ?? 0) + 1);
  }
  const fracaoMonotonia = Math.max(...contagemSimbolos.values(), 0) / processadas.length;

  const fracaoRecordacao = fracaoRecordacaoFeedback(processadas);
  const ausenciaFeedback = fracaoRecordacao < LIMIAR_RECORDACAO_FEEDBACK;

  const rAquisciencia = aquiescenciaDiretoReverso(processadas);
  const saturacao = saturacaoConcordancia(processadas);

  const sinais: SinalQualidade[] = [];
  if (rAquisciencia !== null && rAquisciencia > LIMIAR_AQUIESCENCIA_R) {
    sinais.push("aquiescencia_direto_reverso");
  }
  if (Math.abs(saturacao) > LIMIAR_SATURACAO_CONCORDANCIA) {
    sinais.push("saturacao_concordancia");
  }
  if (desvio < LIMIAR_DESVIO_PADRAO) {
    sinais.push("variacao_baixa");
  }
  if (fracaoMonotonia > LIMIAR_MONOTONIA) {
    sinais.push("monotonia");
  }
  if (fracaoApressada > LIMIAR_FRACAO_APRESSADA) {
    sinais.push("resposta_apressada");
  }
  if (fracaoExtrema > LIMIAR_FRACAO_EXTREMA) {
    sinais.push("padrao_extremo");
  }

  const qualidadeBaixa = sinais.length >= 2;

  return {
    sinais,
    qualidadeBaixa,
    aquiescenciaR: rAquisciencia,
    saturacaoConcordancia: saturacao,
    desvioPadrao: desvio,
    fracaoApressada,
    fracaoExtrema,
    fracaoRecordacaoFeedback: fracaoRecordacao,
    ausenciaFeedback,
    notaDiscreta: qualidadeBaixa
      ? "Registramos um padrão de respostas que sugere reaplicação. Os resultados podem não refletir seu perfil com precisão."
      : null,
  };
}