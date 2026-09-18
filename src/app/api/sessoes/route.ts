import { NextResponse } from "next/server";
import { criarSessao } from "@/lib/dados/sessoes";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      nome?: string;
      identidade?: string;
      origem?: string;
      dispositivo?: string;
      codigoEmpresa?: string;
    };
    const sessao = await criarSessao(body);
    return NextResponse.json({ sessaoId: sessao.id, status: sessao.status }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 });
  }
}