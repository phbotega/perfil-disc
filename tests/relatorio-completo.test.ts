import { describe, expect, it } from "vitest";
import { montarRelatorioCompleto } from "../src/lib/core/relatorio-completo";
import { produzirResultado } from "../src/lib/core/relatorio";
import { montarSessao, todos } from "./helpers";

describe("relatório completo", () => {
  it("compara base × expectativa por fator com delta e direção", () => {
    const respostas = montarSessao({
      base: {
        D: { diretos: "++", reversos: "--" },
        I: { diretos: "=", reversos: "=" },
        S: { diretos: "=", reversos: "=" },
        C: { diretos: "=", reversos: "=" },
      },
      expectativa: {
        D: { diretos: "=", reversos: "=" },
        I: { diretos: "=", reversos: "=" },
        S: { diretos: "++", reversos: "--" },
        C: { diretos: "=", reversos: "=" },
      },
    });
    const rel = montarRelatorioCompleto(produzirResultado(respostas));

    expect(rel.padraoNome).toBeTruthy();
    expect(rel.comunicacao).toContain("D");
    expect(rel.fatores).toHaveLength(4);
    const s = rel.fatores.find((f) => f.fator === "S")!;
    expect(s.expectativaPercentil).toBeGreaterThan(s.basePercentil);
    expect(s.direcao).toBe("pedem_mais");
    expect(s.leitura).toContain("Estabilidade");
    for (const f of rel.fatores) {
      expect(f.baseAdjetivo).toBeTruthy();
      expect(f.expectativaAdjetivo).toBeTruthy();
      expect(f.baseFaixa).toBeTruthy();
    }
  });

  it("plano ordena por módulo do delta e inclui leitura clara", () => {
    const respostas = montarSessao({
      base: {
        D: { diretos: "++", reversos: "--" },
        I: { diretos: "=", reversos: "=" },
        S: { diretos: "=", reversos: "=" },
        C: { diretos: "-", reversos: "+" },
      },
      expectativa: {
        D: { diretos: "=", reversos: "=" },
        I: { diretos: "++", reversos: "--" },
        S: { diretos: "=", reversos: "=" },
        C: { diretos: "++", reversos: "--" },
      },
    });
    const rel = montarRelatorioCompleto(produzirResultado(respostas));
    const passos = rel.plano.map((p) => p.fator);
    expect(passos).not.toContain("S");
    expect(rel.plano.length).toBeGreaterThanOrEqual(2);
    const modulos = rel.plano.map((p) => Math.abs(rel.fatores.find((f) => f.fator === p.fator)!.delta));
    expect([...modulos]).toEqual([...modulos].sort((a, b) => b - a));
  });

  it("sem deltas relevantes sugere manter a rota", () => {
    const rel = montarRelatorioCompleto(produzirResultado(todos("=")));
    expect(rel.plano).toHaveLength(1);
    expect(rel.plano[0].titulo).toContain("Manter a rota");
  });

  it("gradiente tem 12 adjetivos por fator com posição de base e expectativa", () => {
    const rel = montarRelatorioCompleto(produzirResultado(todos("++")));
    expect(rel.gradiente).toHaveLength(4);
    for (const g of rel.gradiente) {
      expect(g.adjetivos).toHaveLength(12);
      expect(g.posicaoBase).toBeGreaterThanOrEqual(0);
      expect(g.posicaoExpectativa).toBeLessThanOrEqual(11);
    }
  });

  it("expõe sinais de qualidade quando o preenchimento é extremo", () => {
    const rel = montarRelatorioCompleto(produzirResultado(todos("++")));
    expect(rel.qualidade.sinais.length).toBeGreaterThan(0);
    expect(rel.qualidade.qualidadeBaixa).toBe(true);
  });
});