import { NextResponse } from "next/server";
import { resultadoPerfilDeSessao } from "@/lib/dados/captura";
import { montarRelatorioCompleto } from "@/lib/core/relatorio-completo";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const resultado = await resultadoPerfilDeSessao(id);
  if (!resultado) {
    return NextResponse.json({ erro: "captura_necessaria" }, { status: 409 });
  }
  return NextResponse.json({ relatorio: montarRelatorioCompleto(resultado) }, { status: 200 });
}