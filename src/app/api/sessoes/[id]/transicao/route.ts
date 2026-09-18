import { NextResponse } from "next/server";
import { marcarTransicao } from "@/lib/dados/sessoes";

export const runtime = "nodejs";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    await marcarTransicao(id);
    return NextResponse.json({ status: "transicao" });
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 });
  }
}