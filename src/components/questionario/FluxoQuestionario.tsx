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
import { aposIntersticio, aposResponder, numeroItem, voltar } from "@/lib/questionario/fluxo";

type Fase =
  | "carregando"
  | "erro"
  | "abertura"
  | "dados"
  | "item"
  | "transicao"
  | "intersticio"
  | "concluido";

interface RespostaLocal {
  simbolo: Simbolo;
  tempoMs: number;
}

interface Plano {
  base: string[];
  expectativa: string[];
}

interface SessaoCarregada {
  sessao: { id: string };
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

  const aplicarSessao = (data: SessaoCarregada) => {
    const mapa: Record<string, RespostaLocal> = {};
    for (const r of data.respostas) {
      mapa[r.itemCodigo] = { simbolo: r.simbolo, tempoMs: 0 };
    }
    setSessaoId(data.sessao.id);
    setPlano(data.plano);
    setRespostas(mapa);
    const respondidasBase = data.plano.base.filter((id) => mapa[id]).length;
    const respondidasExp = data.plano.expectativa.filter((id) => mapa[id]).length;
    if (respondidasBase < 32) {
      setCtx("base");
      setIdx(respondidasBase);
      setFase("item");
    } else if (respondidasExp > 0) {
      setCtx("expectativa");
      setIdx(respondidasExp);
      setFase("item");
    } else {
      setCtx("base");
      setIdx(31);
      setFase("transicao");
    }
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
        setFase("concluido");
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
      setFase("concluido");
      return;
    }
    irParaItem(alvo.ctx, alvo.idx);
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

  if (fase === "concluido") {
    return <TelaConcluido />;
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
        <span className="text-xs font-medium text-neutral-500">
          {respondidas}/64 respondidas
        </span>
        <span className="inline-flex w-9 justify-center text-xs tabular-nums text-neutral-500">
          {String(cronometro).padStart(2, "0")}
        </span>
      </div>
      <div className="mx-4 h-1.5 overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full bg-neutral-900 transition-all"
          style={{ width: `${(respondidas / 64) * 100}%` }}
        />
      </div>
      <p className="sticky top-0 z-10 my-5 rounded-xl bg-neutral-100 px-4 py-2.5 text-[11px] font-medium leading-snug text-neutral-600">
        {moldura}
      </p>
      <p className="text-xs font-semibold text-neutral-400">Afirmação {numeracao} de 64</p>
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
      <p className="mt-4 text-center text-[11px] leading-relaxed text-neutral-400">
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

function TelaConcluido() {
  const final = mensagemFinal();
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Questionário concluído</p>
      <h1 className="mt-3 text-2xl font-bold">{final.titulo}</h1>
      <p className="mt-4 text-sm leading-relaxed text-neutral-600">{final.corpo}</p>
      <button
        disabled
        className="mt-8 cursor-not-allowed rounded-xl bg-neutral-300 px-6 py-4 text-base font-semibold text-neutral-500"
      >
        Processando… (Etapa 3)
      </button>
      <p className="mt-3 text-[11px] text-neutral-400">
        Captura de e-mail, relatório gratuito e oferta chegam na etapa 3.
      </p>
    </div>
  );
}