import type { Contexto } from "@/lib/core/tipos";

/** Posição dentro de um bloco de contexto: idx 0..31. */
export interface Posicao {
  ctx: Contexto;
  idx: number;
}

/** Número do item no plano global 1..64: base #1..#32, expectativa #33..#64. */
export function numeroItem(p: Posicao): number {
  return p.ctx === "base" ? p.idx + 1 : 32 + 1 + p.idx;
}

export type AposResponder =
  | { proximo: "item"; alvo: Posicao }
  | { proximo: "transicao" }
  | { proximo: "intersticio"; pos: 16 | 40 | 64 }
  | { proximo: "concluido" };

/**
 * Decide o que vem depois de responder o item na posição `atual`.
 * Interstícios após os itens 16, 40 e 64; transição após o item 32.
 */
export function aposResponder(atual: Posicao): AposResponder {
  const n = numeroItem(atual);
  if (n === 16) return { proximo: "intersticio", pos: 16 };
  if (n === 40) return { proximo: "intersticio", pos: 40 };
  if (n === 64) return { proximo: "concluido" };
  if (n === 32) return { proximo: "transicao" };
  return { proximo: "item", alvo: { ctx: atual.ctx, idx: atual.idx + 1 } };
}

/** Continuação após o interstício: 16 -> base #17, 40 -> expectativa #41. */
export function aposIntersticio(pos: 16 | 40 | 64): Posicao | "concluido" {
  if (pos === 16) return { ctx: "base", idx: 16 };
  if (pos === 40) return { ctx: "expectativa", idx: 8 };
  return "concluido";
}

/**
 * Navegação de voltar dentro/entre blocos. Retorna "transicao" quando está no
 * primeiro item da expectativa. Retorna null no primeiro item da base.
 */
export function voltar(p: Posicao): Posicao | "transicao" | null {
  if (p.ctx === "base") {
    return p.idx > 0 ? { ctx: "base", idx: p.idx - 1 } : null;
  }
  return p.idx > 0 ? { ctx: "expectativa", idx: p.idx - 1 } : "transicao";
}

/** Voltar a partir da tela de transição -> último item do bloco base. */
export const ULTIMO_ITEM_BASE: Posicao = { ctx: "base", idx: 31 };
export const PRIMEIRO_ITEM_EXPECTATIVA: Posicao = { ctx: "expectativa", idx: 0 };