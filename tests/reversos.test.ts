import { describe, expect, it } from "vitest";
import { processarRespostas } from "../src/lib/core/escore";
import { valorComputado } from "../src/lib/core/escala";
import { obterItem } from "../src/lib/core/banco";
import { todos } from "./helpers";

describe("inversão de itens reversos", () => {
  it("a fórmula computada é 6 menos o valor bruto, nos dois contextos", () => {
    for (const bruto of [1, 2, 3, 4, 5]) {
      expect(valorComputado(bruto, true)).toBe(6 - bruto);
    }
  });

  it("itens diretos não são invertidos", () => {
    for (const bruto of [1, 2, 3, 4, 5]) {
      expect(valorComputado(bruto, false)).toBe(bruto);
    }
  });

  it("a inversão acontece na computação do escore para os 64 itens", () => {
    const processadas = processarRespostas(todos("++"));
    for (const r of processadas) {
      const item = obterItem(r.itemId);
      expect(r.valorComputado).toBe(item.reverso ? 1 : 5);
    }
  });

  it("responder '--' num item reverso produz escore alto (5)", () => {
    const processadas = processarRespostas(todos("--"));
    const reverso = processadas.find((r) => r.reverso);
    expect(reverso).toBeDefined();
    expect(reverso!.valorComputado).toBe(5);
  });

  it("todos os 16 reversos estão marcados no banco de itens", () => {
    const idsReversos = ["DB6","DB8","IB5","IB7","SB5","SB8","CB5","CB8",
                         "DE6","DE8","IE6","IE8","SE6","SE8","CE6","CE8"];
    for (const id of idsReversos) {
      expect(obterItem(id).reverso, id).toBe(true);
    }
  });
});