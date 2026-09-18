import { describe, expect, it } from "vitest";
import { areaDoPoligono, CANTOS, pontoDoFator, poligonoDeConjunto, poligonoSvg } from "../src/lib/core/quadrantes";
import { gradienteDoFator, gradientesCompletos } from "../src/lib/core/gradiente";

describe("mapa de quadrantes", () => {
  it("cada fator tem seu canto e o centro é o percentil 0", () => {
    expect(pontoDoFator("D", 100)).toEqual({ x: -1, y: 1 });
    expect(pontoDoFator("I", 100)).toEqual({ x: 1, y: 1 });
    expect(pontoDoFator("S", 100)).toEqual({ x: 1, y: -1 });
    expect(pontoDoFator("C", 100)).toEqual({ x: -1, y: -1 });
    for (const fator of ["D", "I", "S", "C"] as const) {
      expect(pontoDoFator(fator, 0)).toEqual({ x: 0, y: 0 });
    }
  });

  it("D fica no superior esquerdo (tarefa+extroversão) e S no canto oposto", () => {
    expect(CANTOS.D.y).toBeGreaterThan(0);
    expect(CANTOS.D.x).toBeLessThan(0);
    expect(CANTOS.S.y).toBeLessThan(0);
    expect(CANTOS.S.x).toBeGreaterThan(0);
  });

  it("o polígono completo tem 4 vértices e área máxima no percentil 100", () => {
    const pts = poligonoDeConjunto({ D: 100, I: 100, S: 100, C: 100 });
    expect(pts).toHaveLength(4);
    // No percentil 100 os quatro pontos coincidem com os cantos de um quadrado
    // de lado 2 centrado na origem, portanto a área é 4.
    expect(areaDoPoligono(pts)).toBeCloseTo(4, 5);
  });

  it("produz string SVG renderável nos dois conceitos", () => {
    const svg = poligonoSvg({ D: 80, I: 50, S: 30, C: 60 });
    expect(svg.split(" ")).toHaveLength(4);
    expect(svg).toMatch(/\d+\.\d,\d+\.\d/);
    const svg2 = poligonoSvg({ D: 10, I: 90, S: 40, C: 70 });
    expect(svg2.split(" ")).toHaveLength(4);
  });
});

describe("gradiente de adjetivos", () => {
  it("12 adjetivos por fator, do alto para o baixo", () => {
    const alto = gradienteDoFator("D", 100, 0);
    expect(alto.adjetivos).toHaveLength(12);
    expect(alto.posicaoBase).toBe(0);
    expect(gradienteDoFator("D", 0, 100).posicaoBase).toBe(11);
  });

  it("o extremo alto de C é 'Rigoroso' e o baixo é 'Contestador'", () => {
    const g = gradienteDoFator("C", 100, 100);
    expect(g.adjetivos[0]).toBe("Rigoroso");
    expect(g.adjetivos[11]).toBe("Contestador");
  });

  it("marcadores de base e expectativa se posicionam em alturas diferentes", () => {
    const g = gradienteDoFator("I", 87, 25);
    expect(g.posicaoBase).toBeLessThan(g.posicaoExpectativa);
    const todos = gradientesCompletos({ D: 50, I: 87, S: 25, C: 60 }, { D: 50, I: 25, S: 87, C: 60 });
    expect(todos).toHaveLength(4);
  });
});