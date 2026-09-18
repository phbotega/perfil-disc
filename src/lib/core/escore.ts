import { obterItem, obterReverso } from "./banco";
import { valorBrutoDeSimbolo, valorComputado } from "./escala";
import { percentilDeBruto } from "./normas";
import type { Normas } from "./normas";
import { segmentoDoPercentil } from "./segmentacao";
import { CONTEXTOS, FATORES } from "./tipos";
import type {
  Contexto,
  EscoreFator,
  Fator,
  RespostaBruta,
  RespostaItem,
} from "./tipos";

/** Converte respostas brutas em valores computados e valida integridade. */
export function processarRespostas(respostas: RespostaBruta[]): RespostaItem[] {
  return respostas.map((r) => {
    const item = obterItem(r.itemId);
    const bruto = valorBrutoDeSimbolo(r.simbolo);
    return {
      itemId: r.itemId,
      contexto: item.contexto,
      fator: item.fator,
      texto: item.texto,
      reverso: item.reverso,
      simbolo: r.simbolo,
      valorBruto: bruto,
      valorComputado: valorComputado(bruto, item.reverso),
      tempoMs: r.tempoMs,
    };
  });
}

export function validarCompletude(
  processadas: RespostaItem[],
  contexto: Contexto,
): void {
  const esperados = 32;
  const presentes = processadas.filter((r) => r.contexto === contexto).length;
  if (presentes !== esperados) {
    throw new Error(
      `Refere-se a um conjunto incompleto de respostas no contexto ${contexto}: ${presentes}/${esperados}.`,
    );
  }
}

export function somarBruto(
  processadas: RespostaItem[],
  contexto: Contexto,
  fator: Fator,
): number {
  return processadas
    .filter((r) => r.contexto === contexto && r.fator === fator)
    .reduce((acc, r) => acc + r.valorComputado, 0);
}

export function escoreFator(
  processadas: RespostaItem[],
  contexto: Contexto,
  fator: Fator,
  normas: Normas,
): EscoreFator {
  const bruto = somarBruto(processadas, contexto, fator);
  const percentual = ((bruto - 8) / 32) * 100;
  const norma = normas.porContexto[contexto][fator];
  const { percentil, z } = percentilDeBruto(bruto, norma);
  const seg = segmentoDoPercentil(percentil);
  return {
    fator,
    contexto,
    bruto,
    percentual,
    percentil,
    z,
    segmento: seg.segmento,
    faixa: seg.rotulo,
  };
}

export function calcularEscores(
  processadas: RespostaItem[],
  normas: Normas,
): {
  base: Record<Fator, EscoreFator>;
  expectativa: Record<Fator, EscoreFator>;
} {
  const base = {} as Record<Fator, EscoreFator>;
  const expectativa = {} as Record<Fator, EscoreFator>;
  for (const contexto of CONTEXTOS) {
    validarCompletude(processadas, contexto);
    const alvo = contexto === "base" ? base : expectativa;
    for (const fator of FATORES) {
      alvo[fator] = escoreFator(processadas, contexto, fator, normas);
    }
  }
  return { base, expectativa };
}