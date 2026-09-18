import "dotenv/config";
import { banco, fechar } from "../src/db";
import { itens, normas } from "../src/db/schema";
import { BANCO_VERSAO, listarItems } from "../src/lib/core/banco";
import { normasProvisorias } from "../src/lib/core/normas";

async function carregarItens(): Promise<void> {
  const bancoDeItens = listarItems();
  await banco()
    .insert(itens)
    .values(
      bancoDeItens.map((i) => ({
        codigo: i.id,
        contexto: i.contexto,
        fator: i.fator,
        afirmacao: i.texto,
        reverso: i.reverso,
        versaoBanco: BANCO_VERSAO,
      })),
    )
    .onConflictDoUpdate({
      target: itens.codigo,
      set: {
        contexto: itens.contexto,
        fator: itens.fator,
        afirmacao: itens.afirmacao,
        reverso: itens.reverso,
        versaoBanco: itens.versaoBanco,
      },
    })
    .returning({ codigo: itens.codigo });

  const total = (await banco().select({ codigo: itens.codigo }).from(itens)).length;
  console.log(`[seed] itens carregados no banco: ${total}`);
}

async function carregarNormasProvisorias(): Promise<void> {
  const n = normasProvisorias();
  const linhas = (["base", "expectativa"] as const)
    .flatMap((contexto) =>
      (["D", "I", "S", "C"] as const).map((fator) => {
        const norm = n.porContexto[contexto][fator];
        return {
          contexto,
          fator,
          media: norm.media.toFixed(3),
          desvio: norm.desvio.toFixed(3),
          n: norm.n,
          provisoria: n.provisoria,
          vigente: true,
        };
      }),
    );

  await banco()
    .insert(normas)
    .values(linhas)
    .onConflictDoUpdate({
      target: [normas.contexto, normas.fator, normas.vigente],
      set: {
        media: normas.media,
        desvio: normas.desvio,
        n: normas.n,
        provisoria: normas.provisoria,
      },
    });
  console.log(`[seed] normas provisórias carregadas: ${linhas.length} (provisoria=${n.provisoria})`);
}

async function main(): Promise<void> {
  await carregarItens();
  await carregarNormasProvisorias();
  await fechar();
}

main().catch(async (err) => {
  console.error("[seed] erro:", err);
  await fechar();
  process.exit(1);
});