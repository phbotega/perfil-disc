"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { obterItem } from "@/lib/core/banco";
import { VALOR_POR_SIMBOLO } from "@/lib/core/escala";
import type { Contexto, Simbolo } from "@/lib/core/tipos";
import {
  mensagemApos16,
  mensagemApos40,
  mensagemFinal,
  type RespostaLinha,
} from "@/lib/questionario/intersticios";
import { aposIntersticio, aposResponder, destinoDeRetomada, numeroItem, ULTIMO_ITEM_BASE, voltar } from "@/lib/questionario/fluxo";
import { validarCaptura, type ErrosCaptura, type RelatorioGratuito } from "@/lib/core/relatorio-gratis";
import type { RelatorioCompleto } from "@/lib/core/relatorio-completo";

type Fase =
  | "carregando"
  | "erro"
  | "abertura"
  | "dados"
  | "item"
  | "transicao"
  | "intersticio"
  | "captura"
  | "relatorio"
  | "completo";

interface RespostaLocal {
  simbolo: Simbolo;
  tempoMs: number;
}

interface Plano {
  base: string[];
  expectativa: string[];
}

interface SessaoCarregada {
  sessao: { id: string; status: string; nome: string | null };
  respostas: { itemCodigo: string; simbolo: Simbolo }[];
  plano: Plano;
}

const CHAVE_SESSAO = "disc_sessao_v1";

const OPCOES: { simbolo: Simbolo; rotulo: string; simboloExibido: string }[] = [
  { simbolo: "++", rotulo: "Concordo totalmente", simboloExibido: "++" },
  { simbolo: "+", rotulo: "Concordo parcialmente", simboloExibido: "+" },
  { simbolo: "=", rotulo: "Neutro", simboloExibido: "=" },
  { simbolo: "-", rotulo: "Discordo parcialmente", simboloExibido: "-" },
  { simbolo: "--", rotulo: "Discordo totalmente", simboloExibido: "--" },
];

type Pausa =
  | { tipo: "intersticio16" }
  | { tipo: "intersticio40" }
  | { tipo: "intersticio64" };

export default function FluxoQuestionario() {
  const [fase, setFase] = useState<Fase>("carregando");
  const [erro, setErro] = useState<string>("");
  const [sessaoId, setSessaoId] = useState<string | null>(null);
  const [plano, setPlano] = useState<Plano | null>(null);
  const [respostas, setRespostas] = useState<Record<string, RespostaLocal>>({});
  const [ctx, setCtx] = useState<Contexto>("base");
  const [idx, setIdx] = useState(0);
  const [pausa, setPausa] = useState<Pausa | null>(null);
  const [relatorio, setRelatorio] = useState<RelatorioGratuito | null>(null);
  const [relatorioCompleto, setRelatorioCompleto] = useState<RelatorioCompleto | null>(null);
  const [nome, setNome] = useState("");
  const [identidade, setIdentidade] = useState("");
  const [ilha, setIlha] = useState(false);

  const inicioItemRef = useRef<number>(0);
  const vistosRef = useRef<Set<number>>(new Set());
  const transicaoAvisadaRef = useRef(false);

  useEffect(() => {
    const retomar = async () => {
      const antigo = window.localStorage.getItem(CHAVE_SESSAO);
      if (!antigo) {
        setFase("abertura");
        return;
      }
      try {
        const res = await fetch(`/api/sessoes/${antigo}`);
        if (!res.ok) throw new Error("sessao inválida");
        const data: SessaoCarregada = await res.json();
        aplicarSessao(data);
      } catch {
        window.localStorage.removeItem(CHAVE_SESSAO);
        setFase("abertura");
      }
    };
    void retomar();
  }, []);

  const aplicarSessao = async (data: SessaoCarregada) => {
    const mapa: Record<string, RespostaLocal> = {};
    for (const r of data.respostas) {
      mapa[r.itemCodigo] = { simbolo: r.simbolo, tempoMs: 0 };
    }
    setSessaoId(data.sessao.id);
    setPlano(data.plano);
    setRespostas(mapa);
    if (data.sessao.nome) setNome(data.sessao.nome);
    if (["capturada", "paga", "concluida"].includes(data.sessao.status)) {
      try {
        const res = await fetch(`/api/sessoes/${data.sessao.id}/relatorio-gratuito`);
        if (res.ok) {
          const dadosRel = await res.json();
          setRelatorio(dadosRel.relatorio);
          setFase("relatorio");
          return;
        }
      } catch {
        // segue para retomada normal abaixo
      }
    }
    const respondidasBase = data.plano.base.filter((id) => mapa[id]).length;
    const respondidasExp = data.plano.expectativa.filter((id) => mapa[id]).length;
    const destino = destinoDeRetomada({
      respondidasBase,
      respondidasExpectativa: respondidasExp,
      totalBase: data.plano.base.length,
      totalExpectativa: data.plano.expectativa.length,
    });
    if (destino.tipo === "captura") {
      setFase("captura");
      return;
    }
    if (destino.tipo === "transicao") {
      setCtx("base");
      setIdx(ULTIMO_ITEM_BASE.idx);
      setFase("transicao");
      return;
    }
    setCtx(destino.ctx);
    setIdx(destino.idx);
    setFase("item");
  };

  const iniciar = async (codigoEmpresa?: string) => {
    try {
      const res = await fetch("/api/sessoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origem: new URLSearchParams(window.location.search).get("origem") ?? "organico",
          dispositivo:
            (window.navigator.userAgent ?? "").match(/Mobile|iPhone|Android/i)
              ? "mobile"
              : "desktop",
          codigoEmpresa,
        }),
      });
      if (!res.ok) throw new Error("falha_ao_criar_sessao");
      const data = await res.json();
      setSessaoId(data.sessaoId);
      window.localStorage.setItem(CHAVE_SESSAO, data.sessaoId);
      const planoRes = await fetch(`/api/sessoes/${data.sessaoId}`);
      const completa: SessaoCarregada = await planoRes.json();
      setPlano(completa.plano);
      setRespostas({});
      setCtx("base");
      setIdx(0);
      setFase("dados");
    } catch {
      setErro("Não conseguimos iniciar. Verifique sua conexão e tente de novo.");
      setFase("erro");
    }
  };

  const salvarDados = async () => {
    if (sessaoId) {
      await fetch(`/api/sessoes/${sessaoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, identidade }),
      }).catch(() => {});
    }
    setFase("item");
    inicioItemRef.current = performance.now();
  };

  const itemAtual = (): string | null => {
    if (!plano || fase !== "item") return null;
    return plano[ctx][idx];
  };

  const contadorRespondidas = () => {
    const b = plano ? plano.base.filter((id) => respostas[id]).length : 0;
    const e = plano ? plano.expectativa.filter((id) => respostas[id]).length : 0;
    return b + e;
  };

  // Número do item no plano global (1..64).
  const numeracaoTela = () => numeroItem({ ctx, idx });

  const irParaItem = (ctx: Contexto, idx: number) => {
    setCtx(ctx);
    setIdx(idx);
    setFase("item");
    inicioItemRef.current = performance.now();
  };

  const aplicarAposResponder = (
    decisao: ReturnType<typeof aposResponder>,
    mapa: Record<string, RespostaLocal>,
  ) => {
    void mapa;
    if (decisao.proximo === "item") {
      irParaItem(decisao.alvo.ctx, decisao.alvo.idx);
      return;
    }
    if (decisao.proximo === "transicao") {
      if (sessaoId && !transicaoAvisadaRef.current) {
        transicaoAvisadaRef.current = true;
        void fetch(`/api/sessoes/${sessaoId}/transicao`, { method: "POST" }).catch(() => {});
      }
      setFase("transicao");
      return;
    }
    if (decisao.proximo === "concluido") {
      setPausa({ tipo: "intersticio64" });
      setFase("intersticio");
      return;
    }
    if (decisao.proximo === "intersticio") {
      const pos = decisao.pos;
      if (pos === 64 || !vistosRef.current.has(pos)) {
        vistosRef.current.add(pos);
        setPausa({ tipo: pos === 16 ? "intersticio16" : pos === 40 ? "intersticio40" : "intersticio64" });
        setFase("intersticio");
        return;
      }
      // Interstício já exibido nesta visita: continua direto no próximo item.
      const alvo = aposIntersticio(pos);
      if (alvo === "concluido") {
        setFase("captura");
        return;
      }
      irParaItem(alvo.ctx, alvo.idx);
    }
  };

  const responder = useCallback(
    async (simbolo: Simbolo) => {
      const itemId = itemAtual();
      if (!itemId || !sessaoId || ilha) return;
      const tempoMs = Math.max(0, Math.round(performance.now() - inicioItemRef.current));
      setIlha(true);
      const novo = {
        ...respostas,
        [itemId]: { simbolo, tempoMs },
      };
      setRespostas(novo);
      try {
        await fetch(`/api/sessoes/${sessaoId}/respostas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemCodigo: itemId, simbolo, tempoMs }),
        });
      } catch {
        // resposta não sincronizou; mantém no estado local para retomar depois
      }
      aplicarAposResponder(aposResponder({ ctx, idx }), novo);
      setIlha(false);
    },
    [itemAtual, sessaoId, ilha, respostas, ctx, idx],
  );

  const continuarPosIntersticio = () => {
    if (!pausa) return;
    const pos = pausa.tipo === "intersticio16" ? 16 : pausa.tipo === "intersticio40" ? 40 : 64;
    const alvo = aposIntersticio(pos);
    setPausa(null);
    if (alvo === "concluido") {
      setFase("captura");
      return;
    }
    irParaItem(alvo.ctx, alvo.idx);
  };

  const concluirCaptura = async (entrada: {
    email: string;
    telefone?: string;
    consentimentoMarketing: boolean;
    setErros: (e: ErrosCaptura) => void;
  }) => {
    const erros = validarCaptura(entrada.email, true);
    if (erros.email) {
      entrada.setErros(erros);
      return;
    }
    if (!sessaoId) return;
    try {
      const res = await fetch(`/api/sessoes/${sessaoId}/captura`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome || undefined,
          email: entrada.email,
          telefone: entrada.telefone,
          consentimentoLgpd: true,
          consentimentoMarketing: entrada.consentimentoMarketing,
        }),
      });
      if (!res.ok) {
        const corpo = await res.json().catch(() => ({}));
        const mensagem =
          corpo.erro === "questionario_incompleto"
            ? "Ainda faltam respostas. Recarregue e conclua o questionário."
            : "Não conseguimos gerar seu resultado. Tente novamente.";
        entrada.setErros({ geral: mensagem });
        return;
      }
      const corpo = await res.json();
      setRelatorio(corpo.relatorio as RelatorioGratuito);
      setFase("relatorio");
    } catch {
      entrada.setErros({ geral: "Sem conexão. Verifique sua internet e tente de novo." });
    }
  };

  const desbloquearCompleto = async (): Promise<boolean> => {
    if (!sessaoId) return false;
    try {
      const res = await fetch(`/api/sessoes/${sessaoId}/relatorio-completo`, {
        cache: "no-store",
      });
      if (!res.ok) return false;
      const corpo = await res.json();
      setRelatorioCompleto(corpo.relatorio as RelatorioCompleto);
      setFase("completo");
      return true;
    } catch {
      return false;
    }
  };

  const voltarNaTela = () => {
    if (fase === "item") {
      const alvo = voltar({ ctx, idx });
      if (alvo === "transicao") {
        setFase("transicao");
      } else if (alvo) {
        irParaItem(alvo.ctx, alvo.idx);
      }
      return;
    }
    if (fase === "transicao") {
      irParaItem("base", 31);
    }
  };

  const linhaIntersticio = (ctxAlvo: Contexto): RespostaLinha[] => {
    const planoAtual = plano ?? { base: [], expectativa: [] };
    const alvo = plano ? plano[ctxAlvo] : [];
    const linhas: RespostaLinha[] = [];
    for (const id of alvo) {
      const r = respostas[id];
      if (!r) continue;
      linhas.push({
        fator: obterItem(id).fator,
        valorComputado:
          obterItem(id).reverso && r.simbolo
            ? 6 - VALOR_POR_SIMBOLO[r.simbolo]
            : VALOR_POR_SIMBOLO[r.simbolo],
      });
    }
    return linhas;
  };

  const intersticio = (() => {
    if (!pausa) return null;
    if (pausa.tipo === "intersticio16") return mensagemApos16(linhaIntersticio("base"));
    if (pausa.tipo === "intersticio40") return mensagemApos40(linhaIntersticio("expectativa"));
    return mensagemFinal();
  })();

  if (fase === "carregando") {
    return <div className="p-8 text-center text-sm text-neutral-500">Preparando…</div>;
  }

  if (fase === "erro") {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-neutral-700">{erro}</p>
        <button
          onClick={() => setFase("abertura")}
          className="mt-4 rounded-xl bg-neutral-900 px-6 py-3 text-sm font-semibold text-white active:scale-95"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (fase === "abertura") {
    return <TelaAbertura onIniciar={iniciar} />;
  }

  if (fase === "dados") {
    return (
      <TelaDados
        nome={nome}
        identidade={identidade}
        setNome={setNome}
        setIdentidade={setIdentidade}
        onContinuar={salvarDados}
      />
    );
  }

  if (fase === "captura") {
    return (
      <TelaCaptura
        nomeInicial={nome}
        onEnviar={(entrada) => concluirCaptura(entrada)}
      />
    );
  }

  if (fase === "relatorio" && relatorio) {
    return (
      <TelaRelatorio
        relatorio={relatorio}
        onDesbloquear={desbloquearCompleto}
      />
    );
  }

  if (fase === "completo" && relatorioCompleto) {
    return (
      <TelaRelatorioCompleto
        relatorio={relatorioCompleto}
        onVoltar={() => setFase("relatorio")}
      />
    );
  }

  if (fase === "transicao") {
    return (
      <TelaTransicao
        onAvançar={() => irParaItem("expectativa", 0)}
        onVoltar={() => irParaItem("base", 31)}
      />
    );
  }

  if (fase === "intersticio" && intersticio) {
    const final = pausa?.tipo === "intersticio64";
    return (
      <TelaIntersticio
        titulo={intersticio.titulo}
        corpo={intersticio.corpo}
        final={final}
        onContinuar={continuarPosIntersticio}
      />
    );
  }

  const itemId = itemAtual();
  const item = itemId ? obterItem(itemId) : null;

  return (
    <TelaItem
      contexto={ctx}
      item={item}
      numeracao={numeracaoTela()}
      respondidas={contadorRespondidas()}
      onVoltar={voltarNaTela}
      onResponder={responder}
    />
  );
}

function TelaItem({
  item,
  contexto,
  numeracao,
  respondidas,
  onVoltar,
  onResponder,
}: {
  item: { id: string; texto: string; contexto: Contexto } | null;
  contexto: Contexto;
  numeracao: number;
  respondidas: number;
  onVoltar: () => void;
  onResponder: (simbolo: Simbolo) => void;
}) {
  const [cronometro, setCronometro] = useState(0);
  useEffect(() => {
    setCronometro(0);
    const inicial = performance.now();
    const t = setInterval(() => setCronometro(Math.round((performance.now() - inicial) / 1000)), 1000);
    return () => clearInterval(t);
  }, [item?.id]);

  if (!item) return null;
  const moldura =
    contexto === "base"
      ? "No seu dia a dia, na maior parte do tempo…"
      : "Lembre dos retornos que você já ouviu sobre como deveria ser…";

  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pb-8 pt-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          onClick={onVoltar}
          aria-label="Voltar"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 active:scale-90"
        >
          ←
        </button>
        <span className="text-sm font-medium text-neutral-500">
          {respondidas}/64 respondidas
        </span>
        <span className="inline-flex w-9 justify-center text-sm tabular-nums text-neutral-500">
          {String(cronometro).padStart(2, "0")}
        </span>
      </div>
      <div className="mx-4 h-1.5 overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full bg-neutral-900 transition-all"
          style={{ width: `${(respondidas / 64) * 100}%` }}
        />
      </div>
      <p className="sticky top-0 z-10 my-5 rounded-xl bg-neutral-100 px-4 py-2.5 text-sm font-medium leading-snug text-neutral-600">
        {moldura}
      </p>
      <p className="text-sm font-semibold text-neutral-400">Afirmação {numeracao} de 64</p>
      <h2 className="mt-2 min-h-28 text-xl font-semibold leading-snug text-neutral-900">
        {item.texto}
      </h2>
      <div className="mt-6 flex flex-col gap-2.5">
        {OPCOES.map((opcao) => (
          <button
            key={opcao.simbolo}
            onClick={() => onResponder(opcao.simbolo)}
            className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 text-left active:scale-[0.98] active:border-neutral-900"
          >
            <span className="flex h-8 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-900 font-mono text-xs font-bold text-white">
              {opcao.simboloExibido}
            </span>
            <span className="text-sm text-neutral-800">{opcao.rotulo}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TelaAbertura({ onIniciar }: { onIniciar: (codigoEmpresa?: string) => void }) {
  const [codigo, setCodigo] = useState("");
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Mapeamento comportamental</p>
      <h1 className="mt-3 text-3xl font-bold leading-tight">
        Quem você é.
        <br />
        O que pedem de você.
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-neutral-600">
        64 afirmações, dois perfis na mesma aplicação. Você responde como é no seu
        dia a dia e depois lembra dos retornos que já recebeu sobre como deveria
        ser. O resultado chega na hora.
      </p>
      <ul className="mt-6 space-y-2 text-sm text-neutral-700">
        <li className="flex gap-2"><span className="text-neutral-400">•</span> 64 afirmações · 5 a 7 minutos</li>
        <li className="flex gap-2"><span className="text-neutral-400">•</span> Dois perfis: base e expectativa do entorno</li>
        <li className="flex gap-2"><span className="text-neutral-400">•</span> Resultado na hora, com perfil gratuito</li>
      </ul>
      <input
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        placeholder="Código da empresa (opcional)"
        className="mt-8 rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-900"
      />
      <button
        onClick={() => onIniciar(codigo || undefined)}
        className="mt-3 rounded-xl bg-neutral-900 px-6 py-4 text-base font-semibold text-white active:scale-95"
      >
        Começar
      </button>
      <p className="mt-4 text-center text-xs leading-relaxed text-neutral-400">
        Ferramenta de mapeamento comportamental para autoconhecimento e
        desenvolvimento. Não constitui avaliação psicológica.
      </p>
    </div>
  );
}

function TelaDados({
  nome,
  identidade,
  setNome,
  setIdentidade,
  onContinuar,
}: {
  nome: string;
  identidade: string;
  setNome: (v: string) => void;
  setIdentidade: (v: string) => void;
  onContinuar: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <h1 className="text-2xl font-bold">Antes de começar</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Opcional. Usado apenas nos textos do relatório e na normatização por
        grupo. Não influencia o resultado.
      </p>
      <label className="mt-6 block text-xs font-semibold text-neutral-500">Nome</label>
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Como podemos te chamar?"
        className="mt-1.5 rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-900"
        maxLength={40}
      />
      <label className="mt-4 block text-xs font-semibold text-neutral-500">Como você se identifica</label>
      <input
        value={identidade}
        onChange={(e) => setIdentidade(e.target.value)}
        placeholder="Ex.: líder de equipe, analista, estudante…"
        className="mt-1.5 rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-900"
        maxLength={40}
      />
      <button
        onClick={onContinuar}
        className="mt-8 rounded-xl bg-neutral-900 px-6 py-4 text-base font-semibold text-white active:scale-95"
      >
        Continuar
      </button>
    </div>
  );
}

function TelaTransicao({
  onAvançar,
  onVoltar,
}: {
  onAvançar: () => void;
  onVoltar: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <button
        onClick={onVoltar}
        aria-label="Voltar"
        className="mb-6 flex h-9 w-9 items-center justify-center self-start rounded-full bg-neutral-100 text-neutral-700 active:scale-90"
      >
        ←
      </button>
      <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Mudança de cenário</p>
      <h1 className="mt-3 text-3xl font-bold leading-tight">
        Agora não é sobre você.
        <br />
        É sobre o que pedem de você.
      </h1>
      <p className="mt-4 text-base leading-relaxed text-neutral-700">
        As próximas 32 afirmações <strong>não</strong> são sobre como você é. São
        sobre retornos que você já recebeu de chefe, sócio, equipe, cliente ou
        família sobre como você <strong>deveria</strong> ser.
      </p>
      <div className="mt-5 rounded-2xl bg-neutral-100 p-4 text-sm leading-relaxed text-neutral-700">
        Exemplos reais: <em>“já te disseram para ser mais analítico?”</em>,{" "}
        <em>“para pegar mais leve na cobrança?”</em>,{" "}
        <em>“para se expor mais e aparecer mais?”</em>
        <br />
        <span className="mt-2 block font-medium text-neutral-900">
          Só responda com “concordo” se isso <u>já foi dito para você</u>.
        </span>
      </div>
      <button
        onClick={onAvançar}
        className="mt-8 rounded-xl bg-neutral-900 px-6 py-4 text-base font-semibold text-white active:scale-95"
      >
        Entendi, continuar
      </button>
    </div>
  );
}

function TelaIntersticio({
  titulo,
  corpo,
  final,
  onContinuar,
}: {
  titulo: string;
  corpo: string;
  final: boolean;
  onContinuar: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <h1 className="text-2xl font-bold">{titulo}</h1>
      <p className="mt-4 text-base leading-relaxed text-neutral-700">{corpo}</p>
      <button
        onClick={onContinuar}
        className="mt-8 rounded-xl bg-neutral-900 px-6 py-4 text-base font-semibold text-white active:scale-95"
      >
        {final ? "Ver meu resultado" : "Continuar"}
      </button>
    </div>
  );
}

function TelaCaptura({
  nomeInicial,
  onEnviar,
}: {
  nomeInicial: string;
  onEnviar: (entrada: {
    email: string;
    telefone?: string;
    consentimentoMarketing: boolean;
    setErros: (e: ErrosCaptura) => void;
  }) => void;
}) {
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [consentimento, setConsentimento] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [erros, setErros] = useState<ErrosCaptura>({});
  const [enviando, setEnviando] = useState(false);

  const podeEnviar = validarCaptura(email, consentimento).email === undefined && consentimento && !enviando;

  const enviar = () => {
    if (!podeEnviar) return;
    setEnviando(true);
    onEnviar({
      email,
      telefone: telefone || undefined,
      consentimentoMarketing: marketing,
      setErros: (e) => {
        setEnviando(false);
        setErros(e);
      },
    });
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Resultado pronto</p>
      <h1 className="mt-3 text-3xl font-bold leading-tight">
        Onde enviamos
        <br />
        seu resultado?
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-neutral-600">
        {nomeInicial ? `Ótimo, ${nomeInicial.split(" ")[0]}. ` : ""}Seu relatório gratuito fica disponível na
        hora, direto neste dispositivo — e você recebe uma cópia no e-mail.
      </p>
      <label className="mt-6 block text-xs font-semibold text-neutral-500">E-mail (obrigatório)</label>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="voce@exemplo.com"
        className="mt-1.5 rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-900"
      />
      {erros.email && <p className="mt-1 text-xs text-red-600">{erros.email}</p>}
      <label className="mt-4 block text-xs font-semibold text-neutral-500">Telefone (opcional)</label>
      <input
        value={telefone}
        onChange={(e) => setTelefone(e.target.value)}
        inputMode="tel"
        autoComplete="tel"
        placeholder="(11) 99999-9999"
        className="mt-1.5 rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-900"
      />
      <label className="mt-5 flex items-start gap-3 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={consentimento}
          onChange={(e) => setConsentimento(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-neutral-900"
        />
        <span>
          Autorizo o armazenamento e o tratamento dos meus dados para gerar e enviar este
          resultado, conforme a LGPD. Posso pedir a exclusão a qualquer momento.
        </span>
      </label>
      {erros.consentimento && <p className="mt-1 text-xs text-red-600">{erros.consentimento}</p>}
      <label className="mt-4 flex items-start gap-3 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={marketing}
          onChange={(e) => setMarketing(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-neutral-900"
        />
        <span className="text-neutral-500">Quero receber conteúdos sobre desenvolvimento pessoal (opcional)</span>
      </label>
      {erros.geral && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">{erros.geral}</p>
      )}
      <button
        onClick={enviar}
        disabled={!podeEnviar}
        className="mt-8 rounded-xl bg-neutral-900 px-6 py-4 text-base font-semibold text-white active:scale-95 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500"
      >
        {enviando ? "Gerando…" : "Gerar meu resultado"}
      </button>
      <p className="mt-4 text-center text-xs leading-relaxed text-neutral-400">
        Seus dados não são compartilhados com terceiros e são usados apenas para o
        resultado e para a normatização estatística anônima.
      </p>
    </div>
  );
}

function TelaRelatorio({
  relatorio,
  onDesbloquear,
}: {
  relatorio: RelatorioGratuito;
  onDesbloquear: () => Promise<boolean>;
}) {
  const [desbloqueando, setDesbloqueando] = useState(false);
  const [erroDesbloqueio, setErroDesbloqueio] = useState<string | null>(null);
  const clicarDesbloquear = async () => {
    setDesbloqueando(true);
    setErroDesbloqueio(null);
    const ok = await onDesbloquear();
    setDesbloqueando(false);
    if (!ok) {
      setErroDesbloqueio("Não deu para abrir agora. Recarregue a página e tente novamente.");
    }
  };
  const canais: { fator: string; rotulo: string; percentil: number; faixa: string }[] = [
    { fator: "D", rotulo: "Direção", percentil: relatorio.base.D.percentil, faixa: relatorio.base.D.faixa },
    { fator: "D", rotulo: "Direção", percentil: relatorio.base.D.percentil, faixa: relatorio.base.D.faixa },
    { fator: "I", rotulo: "Influência", percentil: relatorio.base.I.percentil, faixa: relatorio.base.I.faixa },
    { fator: "S", rotulo: "Estabilidade", percentil: relatorio.base.S.percentil, faixa: relatorio.base.S.faixa },
    { fator: "C", rotulo: "Conformidade", percentil: relatorio.base.C.percentil, faixa: relatorio.base.C.faixa },
  ];

  const fraseItp = (() => {
    switch (relatorio.resumoExpectativa.itpClassificacao) {
      case "convergencia_alta":
        return "Grande convergência: o que o entorno pede de você está muito próximo do seu jeito natural.";
      case "tensao_produtiva":
        return "Tensão produtiva: há diferenças pontuais entre você e as demandas ao redor — normalmente saudáveis e administráveis.";
      case "tensao_alta":
        return "Tensão alta: a expectativa do ambiente destoa do seu jeito natural em várias dimensões. Dá trabalho, mas costuma ser um sinal de crescimento.";
      default:
        return "Tensão extrema: as demandas ao redor estão muito distantes do seu estilo base. Vale olhar esse cenário com atenção.";
    }
  })();

  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-4 pb-16 pt-8">
      <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Seu resultado</p>
      <h1 className="mt-2 text-3xl font-bold leading-tight">{relatorio.padraoNome}</h1>
      <p className="mt-2 text-sm text-neutral-600">{relatorio.comunicacao}</p>
      {relatorio.perfilCombinado && (
        <p className="mt-1 text-xs font-medium text-neutral-500">
          Perfil combinado: {relatorio.dominante} + {relatorio.secundario}
        </p>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-bold text-neutral-800">Movimento natural (base)</h2>
        <svg viewBox="0 0 400 400" className="mx-auto mt-4 aspect-square w-full max-w-xs">
          <polygon points="20,380 380,380 380,20 20,20" fill="#f5f5f5" stroke="#e5e5e5" strokeWidth="1" />
          <line x1="200" y1="20" x2="200" y2="380" stroke="#e5e5e5" strokeWidth="1" />
          <line x1="20" y1="200" x2="380" y2="200" stroke="#e5e5e5" strokeWidth="1" />
          <text x="37" y="52" className="fill-neutral-700 text-sm font-bold">D</text>
          <text x="345" y="52" className="fill-neutral-700 text-sm font-bold">I</text>
          <text x="350" y="374" className="fill-neutral-700 text-sm font-bold">S</text>
          <text x="30" y="374" className="fill-neutral-700 text-sm font-bold">C</text>
          <polygon points={relatorio.quadranteBaseSvg} fill="#18181b" fillOpacity="0.18" stroke="#18181b" strokeWidth="2" />
        </svg>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-bold text-neutral-800">Intensidade de cada fator (percentil)</h2>
        {canais.map((c) => (
          <div key={c.fator}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-700">
                {c.rotulo} ({c.fator})
              </span>
              <span className="text-neutral-500">
                {c.percentil}% · {c.faixa}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-200">
              <div
                className="h-full rounded-full bg-neutral-900"
                style={{ width: `${c.percentil}%` }}
              />
            </div>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-2xl bg-neutral-100 p-4">
        <h2 className="text-sm font-bold text-neutral-800">O que o entorno pede (resumo)</h2>
        <p className="mt-1 text-sm leading-relaxed text-neutral-700">
          {relatorio.resumoExpectativa.itpRotulo} (ITP {relatorio.resumoExpectativa.itp}). {fraseItp}
        </p>
        {relatorio.resumoExpectativa.ausenciaFeedback && (
          <p className="mt-2 text-xs text-neutral-500">
            Não encontramos retornos recorrentes nas suas respostas de expectativa. Isso pode indicar
            um ambiente sem feedback claro.
          </p>
        )}
      </section>

      {relatorio.qualidade.qualidadeBaixa && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
          {relatorio.qualidade.notaDiscreta}
        </p>
      )}

      <section className="mt-8 rounded-2xl border border-dashed border-neutral-300 p-4">
        <h2 className="text-sm font-bold text-neutral-800">Desbloqueie seu relatório completo</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-neutral-600">
          {relatorio.premium.map((linha) => (
            <li key={linha} className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>{linha}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={clicarDesbloquear}
          disabled={desbloqueando}
          className="mt-4 w-full rounded-xl bg-neutral-900 px-6 py-3 text-sm font-semibold text-white active:scale-95 disabled:bg-neutral-300"
        >
          {desbloqueando ? "Abrindo…" : "Desbloquear relatório completo"}
        </button>
        {erroDesbloqueio && (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">{erroDesbloqueio}</p>
        )}
      </section>

      <p className="mt-8 text-center text-xs leading-relaxed text-neutral-400">
        {relatorio.normaProvisoria
          ? "Percentis baseados em norma provisória (amostra embutida), até a normalização empírica com N ≥ 500."
          : "Percentis baseados em norma empírica atualizada."}{" "}
        Ferramenta de mapeamento comportamental para autoconhecimento. Não constitui avaliação psicológica.
      </p>
    </div>
  );
}

function TelaRelatorioCompleto({
  relatorio,
  onVoltar,
}: {
  relatorio: RelatorioCompleto;
  onVoltar: () => void;
}) {
  const badgeDirecao: Record<string, { texto: string; classe: string }> = {
    pedem_mais: { texto: "pedem mais", classe: "bg-neutral-900 text-white" },
    pedem_menos: { texto: "pedem menos", classe: "bg-neutral-200 text-neutral-800" },
    neutro: { texto: "sem cobrança", classe: "bg-neutral-100 text-neutral-500" },
  };

  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-4 pb-16 pt-8">
      <button
        onClick={onVoltar}
        aria-label="Voltar ao resumo"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 active:scale-90"
      >
        ←
      </button>
      <p className="mt-4 text-xs font-bold uppercase tracking-widest text-neutral-400">Relatório completo</p>
      <h1 className="mt-2 text-3xl font-bold leading-tight">{relatorio.padraoNome}</h1>
      <p className="mt-2 text-sm text-neutral-600">{relatorio.comunicacao}</p>
      {relatorio.perfilCombinado && relatorio.secundario && (
        <p className="mt-1 text-xs font-medium text-neutral-500">
          Perfil combinado: {relatorio.dominante} + {relatorio.secundario}
        </p>
      )}

      <section className="mt-8 rounded-2xl bg-neutral-100 p-4">
        <h2 className="text-sm font-bold text-neutral-800">
          O que o entorno pede · {relatorio.resumo.itpRotulo}
          <span className="ml-1 font-normal text-neutral-500">(ITP {relatorio.resumo.itp})</span>
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-neutral-700">{relatorio.resumo.frase}</p>
        {relatorio.resumo.ausenciaFeedback && (
          <p className="mt-2 text-xs text-neutral-500">
            Não encontramos retornos recorrentes nas respostas de expectativa — sinal de ambiente com
            pouco feedback claro.
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-neutral-800">Você (base) × Expectativa</h2>
        <svg viewBox="0 0 400 400" className="mx-auto mt-4 aspect-square w-full max-w-xs">
          <polygon points="20,380 380,380 380,20 20,20" fill="#fafafa" stroke="#e5e5e5" strokeWidth="1" />
          <line x1="200" y1="20" x2="200" y2="380" stroke="#e5e5e5" strokeWidth="1" />
          <line x1="20" y1="200" x2="380" y2="200" stroke="#e5e5e5" strokeWidth="1" />
          <text x="37" y="52" className="fill-neutral-700 text-sm font-bold">D</text>
          <text x="345" y="52" className="fill-neutral-700 text-sm font-bold">I</text>
          <text x="350" y="374" className="fill-neutral-700 text-sm font-bold">S</text>
          <text x="30" y="374" className="fill-neutral-700 text-sm font-bold">C</text>
          <polygon
            points={relatorio.quadranteExpectativaSvg}
            fill="#d6e4ff"
            fillOpacity="0.5"
            stroke="#3b82f6"
            strokeWidth="2"
          />
          <polygon points={relatorio.quadranteBaseSvg} fill="#18181b" fillOpacity="0.16" stroke="#18181b" strokeWidth="2" />
        </svg>
        <div className="mt-3 flex justify-center gap-5 text-xs text-neutral-500">
          <span className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-neutral-900" /> Você (base)
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-400" /> Expectativa
          </span>
        </div>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-sm font-bold text-neutral-800">Comparativo fator a fator</h2>
        {relatorio.fatores.map((f) => {
          const badge = badgeDirecao[f.direcao];
          return (
            <div key={f.fator} className="rounded-2xl border border-neutral-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-neutral-900">
                  {f.rotulo} ({f.fator})
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.classe}`}>
                  {badge.texto}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-neutral-100 p-3">
                  <p className="font-semibold text-neutral-500">Você ({f.rotulo})</p>
                  <p className="mt-1 text-lg font-bold text-neutral-900">{f.basePercentil}%</p>
                  <p className="text-neutral-500">{f.baseFaixa} · {f.baseAdjetivo}</p>
                </div>
                <div className="rounded-xl bg-blue-50 p-3">
                  <p className="font-semibold text-blue-700">Expectativa</p>
                  <p className="mt-1 text-lg font-bold text-neutral-900">{f.expectativaPercentil}%</p>
                  <p className="text-blue-600">{f.expectativaFaixa} · {f.expectativaAdjetivo}</p>
                </div>
              </div>
              <div className="mt-2 text-xs text-neutral-600">
                <span className="font-semibold text-neutral-800">Delta: </span>
                {f.delta > 0 ? `+${f.delta}` : f.delta} pontos
              </div>
              <p className="mt-2 text-sm leading-relaxed text-neutral-700">{f.leitura}</p>
            </div>
          );
        })}
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-sm font-bold text-neutral-800">Gradiente de comportamentos</h2>
        {relatorio.gradiente.map((g) => (
          <div key={g.fator} className="rounded-2xl bg-neutral-100 p-4">
            <p className="text-xs font-bold text-neutral-700">
              {g.fator} · do alto para o baixo
            </p>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
              {g.adjetivos.map((adj, i) => (
                <div
                  key={adj}
                  className={`flex items-center gap-2 text-xs ${
                    i === g.posicaoBase
                      ? "font-bold text-neutral-900"
                      : i === g.posicaoExpectativa
                        ? "font-semibold text-blue-700"
                        : "text-neutral-500"
                  }`}
                >
                  <span className="w-3 text-right tabular-nums">{i + 1}</span>
                  <span>{adj}</span>
                  {i === g.posicaoBase && <span className="ml-auto text-neutral-400">você</span>}
                  {i === g.posicaoExpectativa && <span className="ml-auto text-blue-600">expectativa</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-neutral-800">Plano de desenvolvimento</h2>
        <ol className="mt-3 space-y-3">
          {relatorio.plano.map((passo, i) => (
            <li key={passo.titulo} className="flex gap-3 rounded-2xl bg-neutral-100 p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-bold text-neutral-900">
                  {passo.titulo} <span className="font-medium text-neutral-400">({passo.fator})</span>
                </p>
                <p className="mt-1 text-sm leading-relaxed text-neutral-600">{passo.descricao}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {relatorio.qualidade.sinais.length > 0 && (
        <section className="mt-8 rounded-2xl border border-neutral-200 p-4">
          <h2 className="text-sm font-bold text-neutral-800">Sinais de atenção no preenchimento</h2>
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-neutral-600">
            {relatorio.qualidade.sinais.map((s) => (
              <li key={s.codigo} className="flex gap-2">
                <span className="text-neutral-400">—</span>
                <span>{s.frase}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-8 text-center text-xs leading-relaxed text-neutral-400">
        {relatorio.normaProvisoria
          ? "Percentis baseados em norma provisória (amostra embutida), até a normalização empírica com N ≥ 500."
          : "Percentis baseados em norma empírica atualizada."}{" "}
        Ferramenta de mapeamento comportamental para autoconhecimento. Não constitui avaliação psicológica.
      </p>
    </div>
  );
}