import { describe, expect, it } from "vitest";
import {
  concordanciaPorFator,
  fatorMaisForte,
  mensagemApos16,
  mensagemApos40,
  mensagemFinal,
  type RespostaLinha,
} from "../src/lib/questionario/intersticios";

const linha = (fator: RespostaLinha["fator"], valorComputado: number): RespostaLinha => ({
  fator,
  valorComputado,
});

describe("interstícios com dados reais da sessão", () => {
  it("concordância conta só valores computados >= 4", () => {
    const linhas: RespostaLinha[] = [
      linha("D", 5),
      linha("D", 4),
      linha("D", 3),
      linha("I", 5),
      linha("S", 2),
    ];
    const c = concordanciaPorFator(linhas);
    expect(c.D).toBe(2);
    expect(c.I).toBe(1);
    expect(c.S).toBe(0);
  });

  it("fator mais forte domina a mensagem do interstício 16 em linguagem qualitativa", () => {
    const linhas: RespostaLinha[] = [
      linha("D", 5), linha("D", 5), linha("D", 4),
      linha("I", 2), linha("S", 1), linha("C", 1),
    ];
    const msg = mensagemApos16(linhas);
    expect(fatorMaisForte(linhas)).toBe("D");
    expect(msg.corpo).toContain("direção e decisão");
    expect(msg.corpo).not.toMatch(/\d+%/);
  });

  it("mensagem neutra quando a pessoa não se reconhece nas primeiras afirmações", () => {
    const linhas: RespostaLinha[] = [
      linha("D", 2), linha("I", 1), linha("S", 1), linha("C", 3),
    ];
    const msg = mensagemApos16(linhas);
    expect(msg.corpo).toBeTruthy();
    expect(msg.corpo).not.toContain("aponta para");
  });

  it("sem recordação de retornos, o interstício 40 aponta as três leituras", () => {
    const linhas: RespostaLinha[] = [
      linha("D", 1), linha("I", 1), linha("S", 1), linha("C", 1),
      linha("D", 2), linha("I", 2), linha("S", 2), linha("C", 2),
    ];
    const msg = mensagemApos40(linhas);
    expect(msg.corpo).toContain("três leituras possíveis");
  });

  it("o interstício 40 cita a demanda mais recorrente sem percentual falso", () => {
    const linhas: RespostaLinha[] = [
      linha("I", 5), linha("I", 5), linha("I", 4), linha("I", 4),
      linha("D", 5), linha("S", 2), linha("C", 1), linha("C", 1),
    ];
    const msg = mensagemApos40(linhas);
    expect(msg.titulo).toBe("O que o entorno pede");
    expect(msg.corpo).toContain("comunicação e contato com pessoas");
    expect(msg.corpo).not.toMatch(/\d+(,|\d)?%/);
  });

  it("mensagem final fecha os 64 itens", () => {
    const msg = mensagemFinal();
    expect(msg.titulo).toContain("64");
    expect(msg.corpo).toContain("cruzamos");
  });
});