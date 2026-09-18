import { describe, expect, it } from "vitest";
import { produzirResultado } from "../src/lib/core/relatorio";
import { PADROES } from "../src/lib/core/padroes";
import { todos, montarPerfil } from "./helpers";

describe("fator dominante e padrões combinados", () => {
  it("empate total (tudo '='): D vence pela precedência D > C > I > S", () => {
    const r = produzirResultado(todos("="));
    expect(r.dominante).toBe("D");
    expect(r.secundario).toBe("C");
    expect(r.perfilCombinado).toBe(true);
    expect(r.padraoCodigo).toBe("DC");
    expect(r.padraoNome).toBe("O Estrategista");
  });

  it("perfil puro quando o segundo fator está a 8+ pontos percentuais", () => {
    // Base D maximizado (bruto 40), tudo mais em '=' (bruto 24).
    const r = produzirResultado(
      montarPerfil({ D: { diretos: "++", reversos: "--" } }, {}),
    );
    expect(r.escoresBase.D.percentil).toBeGreaterThan(90);
    expect(r.dominante).toBe("D");
    expect(r.secundario).toBeNull();
    expect(r.perfilCombinado).toBe(false);
    expect(r.padraoCodigo).toBe("D");
    expect(r.padraoNome).toBe("O Executor");
  });

  it("perfil combinado quando dois fatores empatam no topo da base", () => {
    // D e C com bruto 34 na base (diretos '+' e reversos '--'), I e S neutros.
    const r = produzirResultado(
      montarPerfil(
        {
          D: { diretos: "+", reversos: "--" },
          C: { diretos: "+", reversos: "--" },
        },
        {},
      ),
    );
    expect(r.escoresBase.D.percentil).toBeCloseTo(r.escoresBase.C.percentil, 5);
    expect(r.dominante).toBe("D"); // desempate por precedência
    expect(r.secundario).toBe("C");
    expect(r.perfilCombinado).toBe(true);
    expect(r.padraoCodigo).toBe("DC");
  });

  it("a expectativa desempata quando base e bruto são iguais", () => {
    // D e C empatados na base; na expectativa D fica acima de C.
    const r = produzirResultado(
      montarPerfil(
        { D: { diretos: "+", reversos: "--" }, C: { diretos: "+", reversos: "--" } },
        { D: { diretos: "+", reversos: "--" } },
      ),
    );
    expect(r.dominante).toBe("D");
  });

  it("o registro contém exatamente os 16 padrões (4 puros + 12 combinados)", () => {
    const esperados = [
      "D", "DI", "DS", "DC", "I", "ID", "IS", "IC",
      "S", "SD", "SI", "SC", "C", "CD", "CI", "CS",
    ];
    expect(Object.keys(PADROES).sort()).toEqual([...esperados].sort());
  });
});