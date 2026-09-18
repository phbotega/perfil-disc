import { gradientesCompletos } from "./gradiente";
import { ROTULOS_ITP } from "./itp";
import { poligonoSvg } from "./quadrantes";
import { comunicacaoDeResultado } from "./relatorio-gratis";
import { segmentoDoPercentil } from "./segmentacao";
import { FATORES } from "./tipos";
import type { DirecaoDelta, Fator, ResultadoPerfil } from "./tipos";

export interface FatorComparativo {
  fator: Fator;
  rotulo: string;
  basePercentil: number;
  baseFaixa: string;
  baseAdjetivo: string;
  expectativaPercentil: number;
  expectativaFaixa: string;
  expectativaAdjetivo: string;
  delta: number;
  direcao: DirecaoDelta;
  leitura: string;
}

export interface PassoDesenvolvimento {
  titulo: string;
  descricao: string;
  fator: Fator;
}

export interface RelatorioCompleto {
  padraoCodigo: string;
  padraoNome: string;
  perfilCombinado: boolean;
  dominante: Fator;
  secundario: Fator | null;
  normaProvisoria: boolean;
  comunicacao: string;
  resumo: {
    itp: number;
    itpClassificacao: string;
    itpRotulo: string;
    frase: string;
    ausenciaFeedback: boolean;
  };
  fatores: FatorComparativo[];
  quadranteBaseSvg: string;
  quadranteExpectativaSvg: string;
  gradiente: {
    fator: Fator;
    adjetivos: string[];
    posicaoBase: number;
    posicaoExpectativa: number;
  }[];
  plano: PassoDesenvolvimento[];
  qualidade: {
    qualidadeBaixa: boolean;
    notaDiscreta: string | null;
    sinais: { codigo: string; frase: string }[];
  };
}

const NOME_POR_FATOR: Record<Fator, string> = {
  D: "Direção",
  I: "Influência",
  S: "Estabilidade",
  C: "Conformidade",
};

const LEITURA: Record<DirecaoDelta, Record<Fator, string>> = {
  pedem_mais: {
    D: "O entorno pede mais Direção: decisões mais rápidas, presença e posicionamento claro.",
    I: "O entorno pede mais Influência: presença, entusiasmo e engajamento maior das pessoas.",
    S: "O entorno pede mais Estabilidade: constância, previsibilidade e acolhimento.",
    C: "O entorno pede mais Conformidade: cuidado com detalhe, critério e aderência a processos.",
  },
  pedem_menos: {
    D: "O entorno pede menos Direção: espaço para os outros opinarem e menos imposição de ritmo.",
    I: "O entorno pede menos Influência: foco, menos dispersão e mais tempo de escuta.",
    S: "O entorno pede menos Estabilidade: agilidade para mudar e menos apego aos combinados antigos.",
    C: "O entorno pede menos Conformidade: menos revisão e mais fluidez com o 'bom o bastante'.",
  },
  neutro: {
    D: "Sem cobrança forte de mudança em Direção: o ritmo atual encontra aceitação no entorno.",
    I: "Sem cobrança forte de mudança em Influência: a forma de se comunicar está alinhada ao entorno.",
    S: "Sem cobrança forte de mudança em Estabilidade: o equilíbrio atual funciona bem.",
    C: "Sem cobrança forte de mudança em Conformidade: o padrão de rigor atual está ajustado.",
  },
};

const ACOES: Record<DirecaoDelta, Record<Fator, [string, string]>> = {
  pedem_mais: {
    D: [
      "Posicionar-se mais rápido",
      "Exponha sua opinião antes de o tema virar pauta e sinalize decisão com prazo. Em reuniões, seja a primeira voz a propor o caminho.",
    ],
    I: [
      "Ocupar mais espaço na conversa",
      "Transforme perguntas em opiniões e convites. Fale logo no início das reuniões e aproveite a rede para mobilizar pessoas.",
    ],
    S: [
      "Ser o ponto de estabilidade",
      "Cumpra combinados sem exceção e registre acordos por escrito. A previsibilidade que você oferece vira segurança para os outros.",
    ],
    C: [
      "Elevar o critério das entregas",
      "Antecipe checklists, prazos e critérios de aceite antes de começar. Trate detalhes como parte da qualidade, não como custo.",
    ],
  },
  pedem_menos: {
    D: [
      "Dar espaço antes de decidir",
      "Consulte ao menos uma pessoa antes de fechar a decisão e explique o porquê. Reduza o tom de urgência nas conversas.",
    ],
    I: [
      "Modular a intensidade",
      "Faça uma pausa depois de cada fala sua e devolva a palavra. Evite repetir o mesmo ponto várias vezes sem perguntar o que os outros pensam.",
    ],
    S: [
      "Acatar mudanças com leveza",
      "Pratique o 'sim, e...' diante de mudanças e evite revisitar decisões já tomadas. Mostre abertura antes de pedir garantias.",
    ],
    C: [
      "Fluir com o processo",
      "Evite pedir novos dados depois de a decisão estar tomada. Aceite o 'bom o bastante' quando o prazo valer mais que o perfeito.",
    ],
  },
  neutro: {
    D: [
      "Manter a clareza nas decisões",
      "Continue sendo objetivo, preservando o custo de ouvir a contraparte antes de fechar.",
    ],
    I: [
      "Manter a aproximação natural",
      "Continue usando a troca de ideias como fonte de energia, sem perder o foco nos acordos.",
    ],
    S: [
      "Preservar a constância",
      "Continue sendo o ponto de equilíbrio; apenas cuide para não absorver o estresse da equipe.",
    ],
    C: [
      "Manter o rigor técnico",
      "Continue usando dados para fundamentar, sem travar o andamento com excesso de detalhe.",
    ],
  },
};

export const SINAIS_QUALIDADE: Record<string, string> = {
  aquiescencia_direto_reverso:
    "As respostas tendem a concordar demais com as afirmações — o que pode inflar o perfil.",
  saturacao_concordancia:
    "Muitas respostas no extremo 'concordo totalmente'; procure distinções mais finas.",
  variacao_baixa:
    "As respostas variaram muito pouco entre os itens, o que pode mascarar diferenças reais.",
  monotonia:
    "Seqüências de respostas idênticas apareceram; talvez tenham sido dadas mecanicamente.",
  resposta_apressada:
    "Algumas respostas foram dadas rapidamente; releia-as com atenção antes de confiar nelas.",
  padrao_extremo:
    "Extremos em excesso (só 'concordo'/'discordo') podem amplificar os percentis do relatório.",
};

function adjetivoDoGradiente(
  gradiente: ReturnType<typeof gradientesCompletos>[number],
  posicao: number,
): string {
  return gradiente.adjetivos[posicao] ?? gradiente.adjetivos[gradiente.adjetivos.length - 1];
}

export function montarRelatorioCompleto(resultado: ResultadoPerfil): RelatorioCompleto {
  const percentisBase = {} as Record<Fator, number>;
  const percentisExp = {} as Record<Fator, number>;
  for (const fator of FATORES) {
    percentisBase[fator] = resultado.escoresBase[fator].percentil;
    percentisExp[fator] = resultado.escoresExpectativa[fator].percentil;
  }
  const gradientes = gradientesCompletos(percentisBase, percentisExp);
  const porFator = Object.fromEntries(gradientes.map((g) => [g.fator, g])) as Record<
    Fator,
    (typeof gradientes)[number]
  >;

  const fatores: FatorComparativo[] = FATORES.map((fator) => {
    const escoreBase = resultado.escoresBase[fator];
    const escoreExp = resultado.escoresExpectativa[fator];
    const grad = porFator[fator];
    return {
      fator,
      rotulo: NOME_POR_FATOR[fator],
      basePercentil: Math.round(escoreBase.percentil),
      baseFaixa: segmentoDoPercentil(escoreBase.percentil).rotulo,
      baseAdjetivo: adjetivoDoGradiente(grad, grad.posicaoBase),
      expectativaPercentil: Math.round(escoreExp.percentil),
      expectativaFaixa: segmentoDoPercentil(escoreExp.percentil).rotulo,
      expectativaAdjetivo: adjetivoDoGradiente(grad, grad.posicaoExpectativa),
      delta: Math.round(resultado.deltas[fator]),
      direcao: resultado.deltaDirecoes[fator],
      leitura: LEITURA[resultado.deltaDirecoes[fator]][fator],
    };
  });

  const comDelta = [...fatores]
    .filter((f) => f.direcao !== "neutro")
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const plano: PassoDesenvolvimento[] = comDelta.map((f) => {
    const [titulo, descricao] = ACOES[f.direcao][f.fator];
    return { titulo, descricao, fator: f.fator };
  });
  if (plano.length === 0) {
    plano.push({
      titulo: "Manter a rota atual",
      descricao:
        "Não há cobrança forte de mudança em nenhum fator. O foco é proteger seus pontos fortes e desenvolver as bordas com intencionalidade.",
      fator: resultado.dominante,
    });
  }

  const frase = (() => {
    switch (resultado.itpClassificacao) {
      case "convergencia_alta":
        return "O que o entorno pede de você está muito próximo do seu jeito natural — um cenário de baixo desgaste.";
      case "tensao_produtiva":
        return "Há diferenças pontuais entre você e as demandas ao redor — saudáveis e administráveis, são o combustível de desenvolvimento.";
      case "tensao_alta":
        return "A expectativa do ambiente destoa do seu estilo em várias dimensões. Exige energia, mas costuma virar crescimento com direção.";
      default:
        return "As demandas ao redor estão muito distantes do seu estilo base. Antes de avançar, vale validar em que contexto isso é real.";
    }
  })();

  return {
    padraoCodigo: resultado.padraoCodigo,
    padraoNome: resultado.padraoNome,
    perfilCombinado: resultado.perfilCombinado,
    dominante: resultado.dominante,
    secundario: resultado.secundario,
    normaProvisoria: resultado.normaProvisoria,
    comunicacao: comunicacaoDeResultado(resultado),
    resumo: {
      itp: Math.round(resultado.itp),
      itpClassificacao: resultado.itpClassificacao,
      itpRotulo: ROTULOS_ITP[resultado.itpClassificacao],
      frase,
      ausenciaFeedback: resultado.qualidade.ausenciaFeedback,
    },
    fatores,
    quadranteBaseSvg: poligonoSvg(percentisBase),
    quadranteExpectativaSvg: poligonoSvg(percentisExp),
    gradiente: gradientes.map((g) => ({
      fator: g.fator,
      adjetivos: g.adjetivos,
      posicaoBase: g.posicaoBase,
      posicaoExpectativa: g.posicaoExpectativa,
    })),
    plano,
    qualidade: {
      qualidadeBaixa: resultado.qualidade.qualidadeBaixa,
      notaDiscreta: resultado.qualidade.notaDiscreta,
      sinais: resultado.qualidade.sinais.map((codigo) => ({
        codigo,
        frase: SINAIS_QUALIDADE[codigo] ?? "Sinal de atenção no preenchimento.",
      })),
    },
  };
}