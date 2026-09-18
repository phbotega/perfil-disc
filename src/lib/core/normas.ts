import { FATORES } from "./tipos";
import type { Contexto, Fator, NormaContexto } from "./tipos";
import { cdfNormalPadrao, clamp } from "./estatistica";
import normaProvisoriaV1 from "../../../content/normas/norma-provisoria-v1.json";

type NormaJson = typeof normaProvisoriaV1;

const NORMA_PROVISORIA = normaProvisoriaV1 as NormaJson;

export interface Normas {
  provisoria: boolean;
  amostraMinima: number;
  porContexto: Record<Contexto, NormaContexto>;
}

export function normasProvisorias(): Normas {
  const porContexto = {} as Record<Contexto, NormaContexto>;
  for (const contexto of ["base", "expectativa"] as Contexto[]) {
    porContexto[contexto] = {};
    for (const fator of FATORES) {
      const n = NORMA_PROVISORIA.por_contexto[contexto][fator];
      porContexto[contexto][fator] = { media: n.media, desvio: n.desvio, n: n.n };
    }
  }
  return {
    provisoria: NORMA_PROVISORIA.provisoria,
    amostraMinima: NORMA_PROVISORIA.criteria.amostra_minima,
    porContexto,
  };
}

/**
 * Percentil populacional a partir do escore bruto e da norma vigente.
 * Logo abaixo do mínimo a CDF não pode chegar a 0 (normal tem cauda infinita),
 * por isso o percentil é limitado ao intervalo [0.5, 99.5]. A conversão para
 * segmento/faxa verbal usa a tabela da seção 5.3.
 */
export function percentilDeBruto(
  bruto: number,
  norma: { media: number; desvio: number },
): { percentil: number; z: number } {
  const z = (bruto - norma.media) / norma.desvio;
  const percentil = clamp(cdfNormalPadrao(z) * 100, 0.5, 99.5);
  return { percentil, z };
}

/**
 * Recalcula normas empíricas por fator e por contexto a partir da amostra
 * validada de resultados. Contextos separados: a distribuição do bloco de
 * expectativa não é a mesma do bloco de base. Retorna null quando a amostra
 * ainda não atingiu o mínimo (N >= 500).
 */
export function calcularNormasEmpiricas(
  amostra: { contexto: Contexto; fator: Fator; bruto: number }[],
  amostraMinima: number,
): Record<Contexto, NormaContexto> | null {
  const total = amostra.length;
  if (total < amostraMinima) return null;

  const porContexto = {} as Record<Contexto, NormaContexto>;
  for (const contexto of ["base", "expectativa"] as Contexto[]) {
    porContexto[contexto] = {};
    for (const fator of FATORES) {
      const vals = amostra
        .filter((a) => a.contexto === contexto && a.fator === fator)
        .map((a) => a.bruto);
      const n = vals.length;
      if (n < amostraMinima) {
        porContexto[contexto][fator] = { media: 0, desvio: 0, n };
        continue;
      }
      const m = vals.reduce((acc, v) => acc + v, 0) / n;
      const variancia = vals.reduce((acc, v) => acc + (v - m) ** 2, 0) / n;
      porContexto[contexto][fator] = {
        media: m,
        desvio: Math.sqrt(variancia),
        n,
      };
    }
  }
  return porContexto;
}

/** Seleciona a norma de um contexto a partir do conjunto vigente (prov. ou empírico). */
export function normaDeContexto(normas: Normas, contexto: Contexto): NormaContexto {
  return normas.porContexto[contexto];
}