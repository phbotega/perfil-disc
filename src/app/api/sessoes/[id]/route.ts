import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { banco } from "@/db";
import { sessoes } from "@/db/schema";
import { obterSessaoComPlano } from "@/lib/dados/sessoes";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const carregada = await obterSessaoComPlano(id);
  if (!carregada) {
    return NextResponse.json({ erro: "sessao_nao_encontrada" }, { status: 404 });
  }
  return NextResponse.json(carregada);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { nome?: string; identidade?: string };
  const db = banco();
  const [atualizada] = await db
    .update(sessoes)
    .set({
      nome: body.nome?.trim() || null,
      identidade: body.identidade?.trim() || null,
      atualizadaEm: new Date(),
    })
    .where(eq(sessoes.id, id))
    .returning({ id: sessoes.id, nome: sessoes.nome, identidade: sessoes.identidade });
  if (!atualizada) {
    return NextResponse.json({ erro: "sessao_nao_encontrada" }, { status: 404 });
  }
  return NextResponse.json(atualizada);
}