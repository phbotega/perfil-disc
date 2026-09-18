import { eq } from "drizzle-orm";
import { banco } from "@/db";
import { normas } from "@/db/schema";
import { normasProvisorias, type Normas } from "@/lib/core/normas";
import { FATORES } from "@/lib/core/tipos";

/**
 * Lê as normas vigentes persistidas (provisórias até a amostra empírica
 * atingir N >= 500). Cai para a norma provisória embutida se a tabela
 * ainda estiver vazia.
 */
export async function lerNormasVigentes(): Promise<Normas> {
  const db = banco();
  const linhas = await db.select().from(normas).where(eq(normas.vigente, true));
  if (linhas.length === 0) return normasProvisorias();

  const porContexto = {} as Normas["porContexto"];
  for (const contexto of ["base", "expectativa"] as const) {
    porContexto[contexto] = {};
    for (const fator of FATORES) {
      const linha = linhas.find((l) => l.contexto === contexto && l.fator === fator);
      porContexto[contexto][fator] = linha
        ? { media: Number(linha.media), desvio: Number(linha.desvio), n: linha.n }
        : { media: 0, desvio: 0, n: 0 };
    }
  }
  return {
    provisoria: !!linhas[0].provisoria,
    amostraMinima: normasProvisorias().amostraMinima,
    porContexto,
  };
}