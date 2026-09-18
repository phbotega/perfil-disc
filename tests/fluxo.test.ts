import { describe, expect, it } from "vitest";
import {
  aposResponder,
  aposIntersticio,
  numeroItem,
  voltar,
  PRIMEIRO_ITEM_EXPECTATIVA,
  ULTIMO_ITEM_BASE,
} from "../src/lib/questionario/fluxo";

describe("sequência do funil de questionário (64 itens)", () => {
  it("percorre base 1..16, interstício, base até 32, transição, expectativa e final", () => {
    const eventos: string[] = [];
    const vistos16 = true;
    const vistos40 = true;

    // Bloco base
    for (let idx = 0; idx < 32; idx++) {
      const atual = { ctx: "base" as const, idx };
      const n = numeroItem(atual);
      const r = aposResponder(atual);
      if (n === 16) {
        expect(r).toEqual({ proximo: "intersticio", pos: 16 });
        eventos.push("intersticio16");
        if (vistos16) continue;
      }
      if (n === 32) {
        expect(r).toEqual({ proximo: "transicao" });
        eventos.push("transicao");
        continue;
      }
      expect(r).toEqual({ proximo: "item", alvo: { ctx: "base", idx: idx + 1 } });
    }

    // Transição avança para o primeiro item da expectativa
    expect(aposIntersticio(16)).toEqual({ ctx: "base", idx: 16 });
    expect(PRIMEIRO_ITEM_EXPECTATIVA).toEqual({ ctx: "expectativa", idx: 0 });
    expect(numeroItem(PRIMEIRO_ITEM_EXPECTATIVA)).toBe(33);
    expect(numeroItem(ULTIMO_ITEM_BASE)).toBe(32);

    // Bloco expectativa
    for (let idx = 0; idx < 32; idx++) {
      const atual = { ctx: "expectativa" as const, idx };
      const n = numeroItem(atual);
      const r = aposResponder(atual);
      if (n === 40) {
        expect(r).toEqual({ proximo: "intersticio", pos: 40 });
        eventos.push("intersticio40");
        if (vistos40) continue;
      }
      if (n === 64) {
        expect(r).toEqual({ proximo: "concluido" });
        eventos.push("concluido");
        continue;
      }
      expect(r).toEqual({ proximo: "item", alvo: { ctx: "expectativa", idx: idx + 1 } });
    }

    expect(eventos).toContain("intersticio16");
    expect(eventos).toContain("intersticio40");
    expect(eventos).toContain("transicao");
    expect(eventos).toContain("concluido");
  });

  it("continuação dos interstícios retoma na posição correta", () => {
    expect(aposIntersticio(16)).toEqual({ ctx: "base", idx: 16 });
    expect(aposIntersticio(40)).toEqual({ ctx: "expectativa", idx: 8 });
    expect(aposIntersticio(64)).toBe("concluido");
  });

  it("voltar navega para trás e atravessa a fronteira da transição", () => {
    expect(voltar({ ctx: "base", idx: 0 })).toBeNull();
    expect(voltar({ ctx: "base", idx: 5 })).toEqual({ ctx: "base", idx: 4 });
    expect(voltar({ ctx: "expectativa", idx: 0 })).toBe("transicao");
    expect(voltar({ ctx: "expectativa", idx: 3 })).toEqual({ ctx: "expectativa", idx: 2 });
  });

  it("numeração global: item 16 na base, item 40 e 64 na expectativa", () => {
    expect(numeroItem({ ctx: "base", idx: 15 })).toBe(16);
    expect(numeroItem({ ctx: "expectativa", idx: 7 })).toBe(40);
    expect(numeroItem({ ctx: "expectativa", idx: 31 })).toBe(64);
  });
});