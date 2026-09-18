import { NextResponse } from "next/server";
import type { Simbolo } from "@/lib/core/tipos";
import { validaSimbolo } from "./validacao";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    itemCodigo?: string;
    simbolo?: string;
    tempoMs?: number;
  };
  if (!body.itemCodigo) {
    return NextResponse.json({ erro: "item_obrigatorio" }, { status: 400 });
  }
  const simbolo = validaSimbolo(body.simbolo);
  if (!simbolo) {
    return NextResponse.json({ erro: "simbolo_invalido" }, { status: 400 });
  }
  const tempoMs = typeof body.tempoMs === "number" && Number.isFinite(body.tempoMs) ? body.tempoMs : 0;

  const { salvarResposta } = await import("@/lib/dados/sessoes");
  try {
    const resultado = await salvarResposta(id, { itemCodigo: body.itemCodigo, simbolo, tempoMs });
    return NextResponse.json(resultado);
  } catch (err) {
    const erro = err instanceof Error ? err.message : "erro_desconhecido";
    if (erro === "sessao_nao_encontrada") {
      return NextResponse.json({ erro }, { status: 404 });
    }
    if (erro === "resposta_fora_de_contexto") {
      return NextResponse.json({ erro }, { status: 409 });
    }
    return NextResponse.json({ erro }, { status: 400 });
  }
}