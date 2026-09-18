import { describe, expect, it } from "vitest";
import { novoStatus, type StatusSessao } from "../src/lib/dados/sessoes";

describe("transições de status da sessão", () => {
  const casos: [StatusSessao, "base" | "expectativa", StatusSessao][] = [
    ["iniciada", "base", "base"],
    ["base", "base", "base"],
    ["transicao", "base", "transicao"],
    ["expectativa", "base", "expectativa"],
    ["iniciada", "expectativa", "iniciada"],
    ["base", "expectativa", "expectativa"],
    ["transicao", "expectativa", "expectativa"],
    ["expectativa", "expectativa", "expectativa"],
    ["concluida", "base", "concluida"],
    ["abandonada", "expectativa", "abandonada"],
  ];

  it("avança sempre para frente, nunca regride", () => {
    for (const [atual, contexto, esperado] of casos) {
      expect(novoStatus(contexto, atual), `${atual} + ${contexto}`).toBe(esperado);
    }
  });

  it("resposta de expectativa exige ter passado pela transição (não avança de 'iniciada')", () => {
    expect(novoStatus("expectativa", "iniciada")).toBe("iniciada");
  });
});