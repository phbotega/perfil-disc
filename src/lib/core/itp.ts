import { FATORES } from "./tipos";
import type { DirecaoDelta, EscoreFator, Fator, ItpClassificacao } from "./tipos";

export const LIMIAR_DELTA = 15;

export interface ClassificacaoItp {
  itp: number;
  classificacao: ItpClassificacao;
  deltas: Record<Fator, number>;
  direcoes: Record<Fator, DirecaoDelta>;
}

/** Regras de leitura do Índice de Tensão de Papel em curva de U (seção 5.5). */
export function classificarItp(itp: number): {
  classificacao: ItpClassificacao;
  rotulo: string;
} {
  if (itp >= 140) return { classificacao: "tensao_extrema", rotulo: "Tensão extrema" };
  if (itp >= 80) return { classificacao: "tensao_alta", rotulo: "Tensão alta" };
  if (itp >= 30) return { classificacao: "tensao_produtiva", rotulo: "Tensão produtiva" };
  return { classificacao: "convergencia_alta", rotulo: "Convergência alta" };
}

/**
 * delta[fator] = percentil_expectativa[fator] - percentil_base[fator].
 * ITP = soma de |delta| para os 4 fatores (0 a 400 teórico, lido em curva de U).
 */
export function calcularItp(
  base: Record<Fator, EscoreFator>,
  expectativa: Record<Fator, EscoreFator>,
): ClassificacaoItp {
  const deltas = {} as Record<Fator, number>;
  const direcoes = {} as Record<Fator, DirecaoDelta>;
  let soma = 0;
  for (const fator of FATORES) {
    const d = expectativa[fator].percentil - base[fator].percentil;
    deltas[fator] = d;
    soma += Math.abs(d);
    if (d >= LIMIAR_DELTA) direcoes[fator] = "pedem_mais";
    else if (d <= -LIMIAR_DELTA) direcoes[fator] = "pedem_menos";
    else direcoes[fator] = "neutro";
  }
  const { classificacao, rotulo } = classificarItp(soma);
  return { itp: soma, classificacao, deltas, direcoes };
}

export const ROTULOS_ITP: Record<ItpClassificacao, string> = {
  convergencia_alta: "Convergência alta",
  tensao_produtiva: "Tensão produtiva",
  tensao_alta: "Tensão alta",
  tensao_extrema: "Tensão extrema",
};