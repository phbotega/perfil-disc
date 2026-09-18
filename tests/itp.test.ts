import { describe, expect, it } from "vitest";
import { produzirResultado } from "../src/lib/core/relatorio";
import { classificarItp, LIMIAR_DELTA } from "../src/lib/core/itp";
import { montarPerfil, todos } from "./helpers";

describe("Índice de Tensão de Papel (curva de U)", () => {
  it("delta zero (base = expectativa) produz ITP 0 e convergência alta", () => {
    const r = produzirResultado(todos("="));
    expect(r.itp).toBe(0);
    expect(r.itpClassificacao).toBe("convergencia_alta");
    for (const fator of ["D", "I", "S", "C"] as const) {
      expect(r.deltas[fator]).toBe(0);
      expect(r.deltaDirecoes[fator]).toBe("neutro");
    }
  });

  it("expectativa puxando S para baixo registra 'pedem_menos'", () => {
    // Base com S muito alto (bruto 40); expectativa com S no mínimo (bruto 8).
    const r = produzirResultado(
      montarPerfil(
        { S: { diretos: "++", reversos: "--" } },
        { S: { diretos: "--", reversos: "++" } },
      ),
    );
    expect(r.deltas.S).toBeLessThanOrEqual(-LIMIAR_DELTA);
    expect(r.deltaDirecoes.S).toBe("pedem_menos");
  });

  it("expectativa puxando D para cima registra 'pedem_mais'", () => {
    const r = produzirResultado(
      montarPerfil(
        {},
        { D: { diretos: "++", reversos: "--" } },
      ),
    );
    expect(r.deltas.D).toBeGreaterThanOrEqual(LIMIAR_DELTA);
    expect(r.deltaDirecoes.D).toBe("pedem_mais");
  });

  it("expectativa no extremo oposto em todos os fatores gera tensão extrema", () => {
    // Base neutra em tudo; expectativa pede muito D e I e pouco S e C.
    const r = produzirResultado(
      montarPerfil(
        {},
        {
          D: { diretos: "++", reversos: "--" },
          I: { diretos: "++", reversos: "--" },
          S: { diretos: "--", reversos: "++" },
          C: { diretos: "--", reversos: "++" },
        },
      ),
    );
    expect(r.itp).toBeGreaterThanOrEqual(140);
    expect(r.itpClassificacao).toBe("tensao_extrema");
  });

  it("tensão moderada se classifica como tensão produtiva (cenário saudável)", () => {
    // Base neutra; expectativa pede apenas C para cima.
    const r = produzirResultado(
      montarPerfil(
        {},
        { C: { diretos: "++", reversos: "--" } },
      ),
    );
    expect(r.itp).toBeGreaterThanOrEqual(30);
    expect(r.itp).toBeLessThan(80);
    expect(r.itpClassificacao).toBe("tensao_produtiva");
  });

  it("limites da curva de U (0-29, 30-79, 80-139, 140+)", () => {
    const casos: [number, string][] = [
      [0, "convergencia_alta"],
      [29, "convergencia_alta"],
      [30, "tensao_produtiva"],
      [79, "tensao_produtiva"],
      [80, "tensao_alta"],
      [139, "tensao_alta"],
      [140, "tensao_extrema"],
      [400, "tensao_extrema"],
    ];
    for (const [valor, esperado] of casos) {
      expect(classificarItp(valor).classificacao, `ITP ${valor}`).toBe(esperado);
    }
  });
});