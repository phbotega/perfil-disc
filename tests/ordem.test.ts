import { describe, expect, it } from "vitest";
import { ordemDaSessao, embaralhar, mulberry32 } from "../src/lib/core/ordem";
import { listarItemsPorContexto } from "../src/lib/core/banco";

describe("ordem de apresentação por sessão", () => {
  it("é determinística: a mesma sessão gera a mesma ordem", () => {
    const a1 = ordemDaSessao("11111111-1111-4111-8111-111111111111");
    const a2 = ordemDaSessao("11111111-1111-4111-8111-111111111111");
    expect(a1.base).toEqual(a2.base);
    expect(a1.expectativa).toEqual(a2.expectativa);
  });

  it("contém todos os 32 itens de cada contexto, sem repetição", () => {
    const ordem = ordemDaSessao("22222222-2222-4222-8222-222222222222");
    const baseOriginal = listarItemsPorContexto("base").map((i) => i.id).sort();
    const expOriginal = listarItemsPorContexto("expectativa").map((i) => i.id).sort();
    expect(ordem.base).toHaveLength(32);
    expect(ordem.expectativa).toHaveLength(32);
    expect([...ordem.base].sort()).toEqual(baseOriginal);
    expect([...ordem.expectativa].sort()).toEqual(expOriginal);
  });

  it("sessões diferentes tendem a ter ordens diferentes", () => {
    let diferentes = 0;
    for (let i = 0; i < 20; i++) {
      const a = ordemDaSessao(`${i}-aaaa-aaaa-aaaa-aaaaaaaaaaaa`);
      const b = ordemDaSessao(`${i + 100000}-bbbb-bbbb-bbbb-bbbbbbbbbbbb`);
      if (JSON.stringify(a.base) !== JSON.stringify(b.base)) diferentes++;
    }
    expect(diferentes).toBeGreaterThan(15);
  });

  it("o embaralhamento Fisher-Yates preserva o conjunto", () => {
    const origem = [1, 2, 3, 4, 5, 6, 7, 8];
    const rng = mulberry32(42);
    const resultado = embaralhar(origem, rng);
    expect([...resultado].sort((x, y) => x - y)).toEqual(origem);
    expect(resultado).not.toEqual(origem); // 42 não produz identidade
  });
});