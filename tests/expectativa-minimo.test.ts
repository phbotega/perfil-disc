import { describe, expect, it } from "vitest";
import { produzirResultado } from "../src/lib/core/relatorio";
import { montarPerfil, todos } from "./helpers";

describe("bloco de expectativa no mínimo e ausência de feedback", () => {
  it("pessoa que discorda dos 32 itens de expectativa: ausência de feedback registrada e convergência alta quando a base também é baixa", () => {
    const r = produzirResultado(todos("--"));
    expect(r.qualidade.fracaoRecordacaoFeedback).toBe(0);
    expect(r.qualidade.ausenciaFeedback).toBe(true);
    // O registro de ausência de feedback é um campo próprio; a qualidade baixa
    // aqui vem dos sinais de resposta uniforme, não do campo "ausência".
    expect(r.qualidade.sinais).not.toContain("resposta_apressada");
    expect(r.itpClassificacao).toBe("convergencia_alta");
  });

  it("ausência de feedback não dispara sozinha qualidade baixa", () => {
    const r = produzirResultado(todos("--"));
    // aqui também há padrao_extremo + saturacao (resposta uniforme), então a
    // qualidade baixa vem destes sinais, não da ausência de feedback em si.
    expect(r.qualidade.sinais.length).toBeGreaterThanOrEqual(2);
    expect(r.qualidade.qualidadeBaixa).toBe(true);
  });

  it("sem recordação de retornos, leitura do ITP não é elogio de alinhamento (dados registrados para regra de 3 hipóteses)", () => {
    // Base média/neutra com expectativa em discordância total ('--' em todos os
    // itens, diretos e reversos): a pessoa nega ter recebido retorno. Os deltas
    // ficam bem negativos, o que registra tensão — não alinhamento.
    const r = produzirResultado(
      montarPerfil(
        {},
        {
          D: { diretos: "--", reversos: "--" },
          I: { diretos: "--", reversos: "--" },
          S: { diretos: "--", reversos: "--" },
          C: { diretos: "--", reversos: "--" },
        },
      ),
    );
    expect(r.qualidade.fracaoRecordacaoFeedback).toBe(0);
    expect(r.qualidade.ausenciaFeedback).toBe(true);
    expect(Math.abs(r.deltas.D)).toBeGreaterThanOrEqual(15);
    expect(r.itpClassificacao).toMatch(/tensao/);
  });
});