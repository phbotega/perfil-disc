import { NextResponse } from "next/server";
import { ErroValidacaoCaptura, registrarCapturaEresultado } from "@/lib/dados/captura";
import { validarCaptura } from "@/lib/core/relatorio-gratis";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    telefone?: string;
    nome?: string;
    consentimentoLgpd?: boolean;
    consentimentoMarketing?: boolean;
  };

  const email = (body.email ?? "").trim();
  const erros = validarCaptura(email, body.consentimentoLgpd === true);
  if (erros.email || erros.consentimento) {
    return NextResponse.json({ erro: "captura_invalida", detalhes: erros }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ erro: "sessao_nao_encontrada" }, { status: 404 });
  }

  try {
    const captura = await registrarCapturaEresultado({
      sessaoId: id,
      email,
      telefone: body.telefone,
      nome: body.nome,
      consentimentoLgpd: true,
      consentimentoMarketing: body.consentimentoMarketing === true,
    });
    return NextResponse.json(
      { leadId: captura.leadId, relatorio: captura.relatorio },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof ErroValidacaoCaptura) {
      const mensagem = err.message.startsWith("questionario_incompleto")
        ? "questionario_incompleto"
        : err.message;
      const status = mensagem === "sessao_nao_encontrada" ? 404 : 409;
      return NextResponse.json({ erro: mensagem }, { status });
    }
    console.error("[captura]", err);
    return NextResponse.json({ erro: "falha_interna" }, { status: 500 });
  }
}