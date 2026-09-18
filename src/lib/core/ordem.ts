import { listarItemsPorContexto } from "./banco";
import type { Contexto } from "./tipos";

function idsDoContexto(contexto: Contexto): string[] {
  return listarItemsPorContexto(contexto).map((i) => i.id);
}

/** Hash xmur3: string -> uint32 (seed determinístico). */
export function hashParaSeed(texto: string): number {
  let h = 1779033703 ^ texto.length;
  for (let i = 0; i < texto.length; i++) {
    h = Math.imul(h ^ texto.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** PRNG mulberry32. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function embaralhar<T>(items: T[], rng: () => number): T[] {
  const copia = items.slice();
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Ordem de apresentação dos itens, derivada da sessão (uuid). É
 * determinística por sessão: retomar o questionário regenera a mesma
 * ordem. O contexto é embaralhado separadamente para evitar efeito de
 * ordem dentro de cada bloco de 32.
 */
export function ordemDaSessao(sessaoId: string): Record<Contexto, string[]> {
  const rng = mulberry32(hashParaSeed(`ordem:${sessaoId}`));
  const rngBase = mulberry32(Math.floor(rng() * 4294967296));
  const rngExpectativa = mulberry32(Math.floor(rng() * 4294967296));
  return { base: wrap("base"), expectativa: wrap("expectativa") };

  function wrap(contexto: Contexto): string[] {
    const ids = idsDoContexto(contexto);
    return embaralhar(ids, contexto === "base" ? rngBase : rngExpectativa);
  }
}