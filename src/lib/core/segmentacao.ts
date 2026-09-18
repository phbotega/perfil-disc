export interface FaixaSegmento {
  segmento: number;
  de: number;
  ate: number;
  rotulo: string;
}

/** Tabela de segmentação por percentil (seção 5.3 da especificação). */
export const TABELA_SEGMENTOS: FaixaSegmento[] = [
  { segmento: 1, de: 0, ate: 6, rotulo: "Muito baixo" },
  { segmento: 2, de: 7, ate: 20, rotulo: "Baixo" },
  { segmento: 3, de: 21, ate: 40, rotulo: "Moderadamente baixo" },
  { segmento: 4, de: 41, ate: 59, rotulo: "Médio" },
  { segmento: 5, de: 60, ate: 79, rotulo: "Média alta" },
  { segmento: 6, de: 80, ate: 93, rotulo: "Alto" },
  { segmento: 7, de: 94, ate: 100, rotulo: "Muito alto" },
];

export function segmentoDoPercentil(percentil: number): FaixaSegmento {
  for (const faixa of TABELA_SEGMENTOS) {
    if (percentil >= faixa.de && percentil <= faixa.ate) return faixa;
  }
  return percentil < 0 ? TABELA_SEGMENTOS[0] : TABELA_SEGMENTOS[TABELA_SEGMENTOS.length - 1];
}

export const FAIXAS_VERBAIS = [
  "muito_baixo",
  "baixo",
  "moderadamente_baixo",
  "medio",
  "media_alta",
  "alto",
  "muito_alto",
] as const;

export function faixaVerbal(percentil: number): (typeof FAIXAS_VERBAIS)[number] {
  return FAIXAS_VERBAIS[segmentoDoPercentil(percentil).segmento - 1];
}