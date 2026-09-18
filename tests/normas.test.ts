import { describe, expect, it } from "vitest";
import { calcularNormasEmpiricas, percentilDeBruto, normasProvisorias } from "../src/lib/core/normas";

describe("normas e percentis", () => {
  it("norma provisória: média 24 e desvio 5,5 por fator e contexto, com flag provisória", () => {
    const n = normasProvisorias();
    expect(n.provisoria).toBe(true);
    for (const contexto of ["base", "expectativa"] as const) {
      for (const fator of ["D", "I", "S", "C"] as const) {
        expect(n.porContexto[contexto][fator].media).toBe(24);
        expect(n.porContexto[contexto][fator].desvio).toBe(5.5);
      }
    }
  });

  it("bruto na média (24) gera percentil 50", () => {
    const { percentil, z } = percentilDeBruto(24, { media: 24, desvio: 5.5 });
    expect(z).toBeCloseTo(0, 5);
    expect(percentil).toBeCloseTo(50, 1);
  });

  it("valores extremos são limitados ao intervalo [0.5, 99.5]", () => {
    const max = percentilDeBruto(1000, { media: 24, desvio: 5.5 });
    const min = percentilDeBruto(-1000, { media: 24, desvio: 5.5 });
    expect(max.percentil).toBeLessThanOrEqual(99.5);
    expect(min.percentil).toBeGreaterThanOrEqual(0.5);
  });

  it("abaixo de N 500 o recálculo empírico não vigora (nulo)", () => {
    const amostra = Array.from({ length: 100 }, () => ({
      contexto: "base" as const,
      fator: "D" as const,
      bruto: 24,
    }));
    expect(calcularNormasEmpiricas(amostra, 500)).toBeNull();
  });

  it("com N >= 500 as normas empíricas substituem as provisórias, por contexto separado", () => {
    const base = Array.from({ length: 500 }, () => ({
      contexto: "base" as const,
      fator: "D" as const,
      bruto: 20,
    }));
    const expectativa = Array.from({ length: 500 }, () => ({
      contexto: "expectativa" as const,
      fator: "D" as const,
      bruto: 28,
    }));
    const n = calcularNormasEmpiricas([...base, ...expectativa], 500);
    expect(n).not.toBeNull();
    expect(n!.base.D.media).toBeCloseTo(20, 5);
    expect(n!.expectativa.D.media).toBeCloseTo(28, 5);
    // desvio populacional de constantes = 0
    expect(n!.base.D.desvio).toBeCloseTo(0, 5);
  });
});