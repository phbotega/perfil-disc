import { describe, expect, it } from "vitest";
import { FATORES } from "../src/lib/core/tipos";
import { produzirResultado } from "../src/lib/core/relatorio";
import { todos } from "./helpers";

describe("casos de borda do algoritmo de escore", () => {
  it("todos '++': bruto 32 por fator, percentual 75, percentil alto, ITP zero", () => {
    const r = produzirResultado(todos("++"));
    for (const fator of FATORES) {
      expect(r.escoresBase[fator].bruto).toBe(32);
      expect(r.escoresBase[fator].percentual).toBeCloseTo(75, 5);
      expect(r.escoresBase[fator].percentil).toBeGreaterThan(80);
      expect(r.escoresBase[fator].segmento).toBe(6);
    }
    expect(r.itp).toBe(0);
    expect(r.itpClassificacao).toBe("convergencia_alta");
    // aceite: perfil com aviso interno de qualidade baixa
    expect(r.qualidade.qualidadeBaixa).toBe(true);
  });

  it("todos '--': bruto 16 por fator, percentual 25, percentil baixo", () => {
    const r = produzirResultado(todos("--"));
    for (const fator of FATORES) {
      expect(r.escoresBase[fator].bruto).toBe(16);
      expect(r.escoresBase[fator].percentual).toBeCloseTo(25, 5);
      expect(r.escoresBase[fator].percentil).toBeLessThan(15);
    }
  });

  it("todos '=': bruto 24 por fator, percentual 50, percentil 50 (Médio)", () => {
    const r = produzirResultado(todos("="));
    for (const fator of FATORES) {
      expect(r.escoresBase[fator].bruto).toBe(24);
      expect(r.escoresBase[fator].percentual).toBeCloseTo(50, 5);
      expect(r.escoresBase[fator].percentil).toBeCloseTo(50, 1);
      expect(r.escoresBase[fator].segmento).toBe(4);
      expect(r.escoresBase[fator].faixa).toBe("Médio");
    }
  });

  it("rejeita conjunto de respostas incompleto", () => {
    const incompletas = todos("++").slice(0, 40);
    expect(() => produzirResultado(incompletas)).toThrow();
  });

  it("rejeita item desconhecido", () => {
    const invalidas = todos("=");
    invalidas[0] = { itemId: "ZZ9", simbolo: "=", tempoMs: 1000 };
    expect(() => produzirResultado(invalidas)).toThrow();
  });
});