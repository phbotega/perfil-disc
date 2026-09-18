import { describe, expect, it } from "vitest";
import {
  montarRelatorioGratuito,
  normalizarEmail,
  validaEmail,
  validarCaptura,
} from "../src/lib/core/relatorio-gratis";
import { produzirResultado } from "../src/lib/core/relatorio";
import { montarSessao, todos } from "./helpers";
import { statusAposCaptura } from "../src/lib/dados/sessoes";

describe("validação da captura LGPD", () => {
  it("aceita e-mails válidos", () => {
    expect(validaEmail(" alguem@exemplo.com.br ")).toBe(true);
    expect(validaEmail("a@b.c")).toBe(true);
  });

  it("rejeita e-mails inválidos", () => {
    expect(validaEmail("")).toBe(false);
    expect(validaEmail("sem-arroba")).toBe(false);
    expect(validaEmail("a@b")).toBe(false);
    expect(validaEmail("a b@c.com")).toBe(false);
  });

  it("normaliza para minúsculas sem espaços", () => {
    expect(normalizarEmail("  Teste@Exemplo.COM ")).toBe("teste@exemplo.com");
  });

  it("exige e-mail e consentimento juntos", () => {
    expect(validarCaptura("", false)).toEqual({
      email: expect.any(String),
      consentimento: expect.any(String),
    });
    expect(validarCaptura("ok@exemplo.com", true)).toEqual({});
    expect(validarCaptura("ok@exemplo.com", false).consentimento).toBeTruthy();
  });
});

describe("transição de status para captura", () => {
  it("captura avança de expectativa e nunca regride", () => {
    expect(statusAposCaptura("iniciada")).toBe("capturada");
    expect(statusAposCaptura("base")).toBe("capturada");
    expect(statusAposCaptura("transicao")).toBe("capturada");
    expect(statusAposCaptura("expectativa")).toBe("capturada");
    expect(statusAposCaptura("capturada")).toBe("capturada");
    expect(statusAposCaptura("paga")).toBe("paga");
    expect(statusAposCaptura("abandonada")).toBe("abandonada");
  });
});

describe("relatório gratuito", () => {
  it("monta perfil, percentis e grafo para um perfil D forte", () => {
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
        S: { diretos: "=", reversos: "=" },
        C: { diretos: "=", reversos: "=" },
      },
    });
    const resultado = produzirResultado(respostas);
    const rel = montarRelatorioGratuito(resultado);

    expect(rel.padraoNome).toBeTruthy();
    expect(rel.dominante).toBe("D");
    expect(Object.keys(rel.base)).toHaveLength(4);
    for (const fator of Object.keys(rel.base)) {
      expect(rel.base[fator as keyof typeof rel.base].percentil).toBeGreaterThan(0);
      expect(rel.base[fator as keyof typeof rel.base].faixa).toBeTruthy();
    }
    expect(rel.quadranteBaseSvg.split(" ")).toHaveLength(4);
    expect(rel.resumoExpectativa.itp).toBeGreaterThanOrEqual(0);
    expect(rel.resumoExpectativa.itpRotulo).toBeTruthy();
    expect(rel.comunicacao).toContain("D");
    expect(rel.premium).toHaveLength(3);
  });

  it("superficie a nota discreta quando a qualidade cai", () => {
    const respostas = todos("++");
    const resultado = produzirResultado(respostas);
    const rel = montarRelatorioGratuito(resultado);
    expect(rel.qualidade.qualidadeBaixa).toBe(true);
    expect(rel.qualidade.notaDiscreta).toBeTruthy();
  });

  it("não vaza detalhe fator a fator da expectativa (resumo qualitativo)", () => {
    const respostas = todos("=");
    const rel = montarRelatorioGratuito(produzirResultado(respostas));
    expect(Object.keys(rel.resumoExpectativa).sort()).toEqual([
      "ausenciaFeedback",
      "itp",
      "itpClassificacao",
      "itpRotulo",
    ]);
  });
});