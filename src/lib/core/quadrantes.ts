import { clamp } from "./estatistica";
import { FATORES } from "./tipos";
import type { Fator } from "./tipos";

/**
 * Plano bidimensional para o mapa de quadrantes (seção 5.6).
 * Eixo horizontal: Tarefa à esquerda (-1), Pessoas à direita (+1).
 * Eixo vertical: Extroversão em cima (+1), Introversão embaixo (-1).
 * Cantos: D no superior esquerdo, I no superior direito, S no inferior direito,
 * C no inferior esquerdo.
 *
 * Cada escore é marcado na diagonal do seu canto em direção ao centro,
 * na proporção do percentil: percentil 0 cola no centro, percentil 100
 * cola no canto.
 */

export interface Ponto2D {
  x: number;
  y: number;
}

export const CANTOS: Record<Fator, Ponto2D> = {
  D: { x: -1, y: 1 },
  I: { x: 1, y: 1 },
  S: { x: 1, y: -1 },
  C: { x: -1, y: -1 },
};

export function pontoDoFator(fator: Fator, percentil: number): Ponto2D {
  const canto = CANTOS[fator];
  const f = clamp(percentil, 0, 100) / 100;
  const x = canto.x * f;
  const y = canto.y * f;
  return { x: x === 0 ? 0 : x, y: y === 0 ? 0 : y };
}

export function poligonoDeConjunto(
  percentis: Record<Fator, number>,
): Ponto2D[] {
  return FATORES.map((fator) => pontoDoFator(fator, percentis[fator]));
}

/** Coordenadas SVG prontas para um viewBox quadrado, ex.: 400x400. */
export function poligonoSvg(
  percentis: Record<Fator, number>,
  viewSize = 400,
  margem = 20,
): string {
  const escala = (viewSize - margem * 2) / 2;
  const cx = viewSize / 2;
  const cy = viewSize / 2;
  const pts = poligonoDeConjunto(percentis);
  return pts
    .map((p) => {
      const x = cx + p.x * escala;
      const y = cy - p.y * escala;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/** Área do polígono (fórmula do shoelace) em unidades do quadrado [-1,1]². */
export function areaDoPoligono(pontos: Ponto2D[]): number {
  let soma = 0;
  for (let i = 0; i < pontos.length; i++) {
    const a = pontos[i];
    const b = pontos[(i + 1) % pontos.length];
    soma += a.x * b.y - b.x * a.y;
  }
  return Math.abs(soma) / 2;
}