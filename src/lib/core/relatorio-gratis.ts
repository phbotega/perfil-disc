import { poligonoSvg } from "./quadrantes";
import { FATORES } from "./tipos";
import type { Fator, ResultadoPerfil } from "./tipos";
import { segmentoDoPercentil } from "./segmentacao";
import { ROTULOS_ITP } from "./itp";

export interface RelatorioGratuito {
  padraoCodigo: string;
  padraoNome: string;
  perfilCombinado: boolean;
  dominante: Fator;
  secundario: Fator | null;
  normaProvisoria: boolean;
  base: Record<Fator, { percentil: number; faixa: string }>;
  quadranteBaseSvg: string;
  resumoExpectativa: {
    itp: number;
    itpClassificacao: string;
    itpRotulo: string;
    ausenciaFeedback: boolean;
  };
  comunicacao: string;
  qualidade: { qualidadeBaixa: boolean; notaDiscreta: string | null };
  premium: string[];
}

const COMUNICACAO_POR_FATOR: Record<Fator, string> = {
  D: "procura agilidade nas conversas: vai direto ao ponto, valoriza objetividade e decisões claras.",
  I: "conversa com energia e leveza: se conecta pelas pessoas, gosta de troca e se expressa de forma aberta.",
  S: "prefere proximidade e constância: escuta com atenção, valoriza acolhimento e evita conflitos desnecessários.",
  C: "valoriza clareza e informação: costuma fundamentar as falas em dados, detalhes e critérios objetivos.",
};

const NOME_POR_FATOR: Record<Fator, string> = {
  D: "Direção",
  I: "Influência",
  S: "Estabilidade",
  C: "Conformidade",
};

/**
 * Recorte gratuito do resultado: perfil + grafo da base + resumo qualitativo
 * da expectativa. Os detalhes fator a fator da expectativa e os gradientes
 * ficam no relatório pago.
 */
export function montarRelatorioGratuito(resultado: ResultadoPerfil): RelatorioGratuito {
  const base = {} as RelatorioGratuito["base"];
  for (const fator of FATORES) {
    const escore = resultado.escoresBase[fator];
    base[fator] = {
      percentil: Math.round(escore.percentil),
      faixa: segmentoDoPercentil(escore.percentil).rotulo,
    };
  }

  const percentisBase = {} as Record<Fator, number>;
  for (const fator of FATORES) percentisBase[fator] = resultado.escoresBase[fator].percentil;

  const comunicacao = (() => {
    const estilo = COMUNICACAO_POR_FATOR[resultado.dominante];
    if (!resultado.perfilCombinado || !resultado.secundario) {
      return `Seu traço mais forte é ${NOME_POR_FATOR[resultado.dominante]} (${resultado.dominante}). Em comunicação, você ${estilo}`;
    }
    return `Seu traço mais forte é ${NOME_POR_FATOR[resultado.dominante]} (${resultado.dominante}), com contribuição de ${NOME_POR_FATOR[resultado.secundario]} (${resultado.secundario}). Em comunicação, você ${estilo}`;
  })();

  return {
    padraoCodigo: resultado.padraoCodigo,
    padraoNome: resultado.padraoNome,
    perfilCombinado: resultado.perfilCombinado,
    dominante: resultado.dominante,
    secundario: resultado.secundario,
    normaProvisoria: resultado.normaProvisoria,
    base,
    quadranteBaseSvg: poligonoSvg(percentisBase),
    resumoExpectativa: {
      itp: resultado.itp,
      itpClassificacao: resultado.itpClassificacao,
      itpRotulo: ROTULOS_ITP[resultado.itpClassificacao],
      ausenciaFeedback: resultado.qualidade.ausenciaFeedback,
    },
    comunicacao,
    qualidade: {
      qualidadeBaixa: resultado.qualidade.qualidadeBaixa,
      notaDiscreta: resultado.qualidade.notaDiscreta,
    },
    premium: [
      "Perfil de expectativa fator a fator, com os deltas entre quem você é e o que pedem de você",
      "Gradientes de comportamento em cada fator, com a posição da base e da expectativa",
      "Dicas práticas de comunicação e caminhos de desenvolvimento",
    ],
  };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validaEmail(raw: string): boolean {
  return EMAIL_REGEX.test(normalizarEmail(raw));
}

export interface ErrosCaptura {
  email?: string;
  consentimento?: string;
  geral?: string;
}

export function validarCaptura(email: string, consentimentoLgpd: boolean): ErrosCaptura {
  const erros: ErrosCaptura = {};
  if (!validaEmail(email)) erros.email = "Informe um e-mail válido para receber seu resultado.";
  if (!consentimentoLgpd) {
    erros.consentimento = "Para liberar seu resultado, é necessário aceitar o tratamento dos dados.";
  }
  return erros;
}