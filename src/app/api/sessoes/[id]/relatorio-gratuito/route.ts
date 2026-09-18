import { NextResponse } from "next/server";
import { relatorioDeSessao } from "@/lib/dados/captura";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const relatorio = await relatorioDeSessao(id);
  if (!relatorio) {
    return NextResponse.json({ erro: "captura_necessaria" }, { status: 409 });
  }
  return NextResponse.json({ relatorio }, { status: 200 });
}