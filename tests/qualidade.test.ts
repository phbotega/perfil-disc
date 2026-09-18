import { describe, expect, it } from "vitest";
import { produzirResultado } from "../src/lib/core/relatorio";
import { avaliarQualidade } from "../src/lib/core/qualidade";
import { processarRespostas } from "../src/lib/core/escore";
import { montarPerfil, todos } from "./helpers";

describe("controles de qualidade da resposta", () => {
  it("todos '++': ≥2 sinais e qualidade baixa (padrão extremo + saturação de concordância)", () => {
    const r = produzirResultado(todos("++"));
    expect(r.qualidade.qualidadeBaixa).toBe(true);
    expect(r.qualidade.sinais).toContain("padrao_extremo");
    expect(r.qualidade.sinais).toContain("saturacao_concordancia");
    expect(r.qualidade.saturacaoConcordancia).toBeCloseTo(1, 5);
  });

  it("todos '--': qualidade baixa (padrão extremo + saturação de discordância)", () => {
    const r = produzirResultado(todos("--"));
    expect(r.qualidade.qualidadeBaixa).toBe(true);
    expect(r.qualidade.saturacaoConcordancia).toBeCloseTo(-1, 5);
  });

  it("tudo '=': variância zero + monotonia dispara qualidade baixa", () => {
    const r = produzirResultado(todos("="));
    expect(r.qualidade.desvioPadrao).toBe(0);
    expect(r.qualidade.sinais).toContain("variacao_baixa");
    expect(r.qualidade.sinais).toContain("monotonia");
    expect(r.qualidade.qualidadeBaixa).toBe(true);
  });

  it("respostas apressadas (>30% dos itens abaixo de 1,5s) disparam o sinal", () => {
    const rapidas = todos("=").map((r) => ({ ...r, tempoMs: 800 }));
    const lentas = todos("=").map((r) => ({ ...r, tempoMs: 4000 }));
    const processadas = processarRespostas([...rapidas.slice(0, 24), ...lentas.slice(24)]);
    const q = avaliarQualidade(processadas);
    expect(q.fracaoApressada).toBeGreaterThan(0.3);
    expect(q.sinais).toContain("resposta_apressada");
  });

  it("perfil coerente e variado não dispara qualidade baixa", () => {
    const r = produzirResultado(
      montarPerfil(
        { D: { diretos: "++", reversos: "--" }, S: { diretos: "--", reversos: "++" } },
        { D: { diretos: "+", reversos: "-" } },
      ),
    );
    expect(r.qualidade.qualidadeBaixa).toBe(false);
    expect(r.qualidade.sinais.length).toBeLessThan(2);
  });

  it("nota discreta de reaplicação aparece apenas com qualidade baixa", () => {
    expect(avaliarQualidade(processarRespostas(todos("++"))).notaDiscreta).toBeTruthy();
    const bom = processarRespostas(
      montarPerfil({ D: { diretos: "++", reversos: "--" } }, {}),
    );
    expect(avaliarQualidade(bom).notaDiscreta).toBeNull();
  });
});