import { banco, fechar } from "../src/db";
import { normas, resultados } from "../src/db/schema";
import { calcularNormasEmpiricas, normasProvisorias } from "../src/lib/core/normas";
import { FATORES } from "../src/lib/core/tipos";
import type { Contexto, Fator } from "../src/lib/core/tipos";

/**
 * Job de recálculo de normas (etapa 8).
 * Quando a amostra validada atinge N >= 500 por contexto, as normas empíricas
 * substituem as provisórias automaticamente. Contextos têm tabelas separadas:
 * a distribuição do bloco de expectativa não é a mesma do bloco de base.
 *
 * Amostra validada = resultados cuja qualidade não foi marcada como baixa.
 */
const AMOSTRA_MINIMA = 500;

async function coletarAmostra(): Promise<{ contexto: Contexto; fator: Fator; bruto: number }[]> {
  const linhas = await banco().select().from(resultados);
  const brutoPorFator = (json: unknown, contexto: Contexto): { contexto: Contexto; fator: Fator; bruto: number }[] => {
    const map = json as Record<Fator, { bruto: number }>;
    return FATORES.map((fator) => ({ contexto, fator, bruto: map[fator].bruto }));
  };
  const amostra: { contexto: Contexto; fator: Fator; bruto: number }[] = [];
  for (const linha of linhas) {
    const qualidade = linha.qualidadeJson as { qualidadeBaixa?: boolean };
    if (qualidade.qualidadeBaixa) continue;
    amostra.push(...brutoPorFator(linha.baseJson, "base"));
    amostra.push(...brutoPorFator(linha.expectativaJson, "expectativa"));
  }
  return amostra;
}

async function main(): Promise<void> {
  const n0 = normasProvisorias();
  if (!n0.provisoria) {
    console.log("[normas] normas empíricas já vigentes; nada a fazer.");
    return;
  }

  const amostra = await coletarAmostra();
  const sujeitos = amostra.length / 8;
  console.log(`[normas] amostra validada: ${sujeitos} resultados (mínimo ${AMOSTRA_MINIMA}).`);

  const empiricas = calcularNormasEmpiricas(amostra, AMOSTRA_MINIMA);
  if (!empiricas) {
    console.log("[normas] amostra ainda abaixo do mínimo; mantendo normas provisórias.");
    return;
  }

  const transacao = await banco();
  await transacao.update(normas).set({ vigente: false }).execute();

  const linhas = (["base", "expectativa"] as const).flatMap((contexto) =>
    FATORES.map((fator) => {
      const n = empiricas[contexto][fator];
      return {
        contexto,
        fator,
        media: n.media.toFixed(3),
        desvio: n.desvio.toFixed(3),
        n: n.n,
        provisoria: false,
        vigente: true,
      };
    }),
  );
  await transacao.insert(normas).values(linhas);
  console.log(`[normas] normas empíricas ativadas: 8 tabelas (base e expectativa separadas).`);
}

main()
  .then(async () => {
    await fechar();
  })
  .catch(async (err) => {
    console.error("[normas] erro:", err);
    await fechar();
    process.exit(1);
  });