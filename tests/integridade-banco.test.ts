import { describe, expect, it } from "vitest";
import { listarItems, contarReversos, molduraDoContexto, totalDeItens } from "../src/lib/core/banco";
import { CONTEXTOS, FATORES } from "../src/lib/core/tipos";

describe("integridade do banco de itens", () => {
  it("tem exatamente 64 afirmações", () => {
    expect(totalDeItens()).toBe(64);
  });

  it("tem 32 itens por contexto", () => {
    for (const contexto of CONTEXTOS) {
      const n = listarItems().filter((i) => i.contexto === contexto).length;
      expect(n).toBe(32);
    }
  });

  it("tem 8 itens por fator em cada contexto", () => {
    for (const contexto of CONTEXTOS) {
      for (const fator of FATORES) {
        const n = listarItems().filter((i) => i.contexto === contexto && i.fator === fator).length;
        expect(n, `${contexto}/${fator}`).toBe(8);
      }
    }
  });

  it("tem 16 reversos no total, 2 por fator em cada contexto", () => {
    expect(contarReversos()).toBe(16);
    for (const contexto of CONTEXTOS) {
      for (const fator of FATORES) {
        const reversos = listarItems().filter(
          (i) => i.contexto === contexto && i.fator === fator && i.reverso,
        );
        expect(reversos.length, `${contexto}/${fator}`).toBe(2);
      }
    }
  });

  it("todos os ids são únicos e seguem o padrão <F><C><n>", () => {
    const ids = listarItems().map((i) => i.id);
    expect(new Set(ids).size).toBe(64);
    for (const id of ids) {
      expect(id).toMatch(/^[DISC][BE]\d$/);
    }
  });

  it("todo item tem texto e chave, e a moldura existe nos dois contextos", () => {
    for (const item of listarItems()) {
      expect(item.texto.trim().length).toBeGreaterThan(10);
    }
    expect(molduraDoContexto("base")).toContain("No seu dia a dia");
    expect(molduraDoContexto("expectativa")).toContain("retornos que você já recebeu");
  });

  it("os itens do bloco de expectativa iniciam com marca de recordação (primeira ordem)", () => {
    const expectativa = listarItems().filter((i) => i.contexto === "expectativa");
    for (const item of expectativa) {
      expect(item.texto, item.id).toMatch(
        /^([Jj]á (me disseram|ouvi|me pediram)|[Mm]e pediram)/,
      );
    }
  });
});