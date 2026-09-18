export type Fator = "D" | "I" | "S" | "C";
export type Contexto = "base" | "expectativa";
export type Simbolo = "++" | "+" | "=" | "-" | "--";

export const FATORES: Fator[] = ["D", "I", "S", "C"];
export const CONTEXTOS: Contexto[] = ["base", "expectativa"];

/** Precedência fixa de desempate: D > C > I > S. */
export const PRECEDENCIA: Record<Fator, number> = { D: 0, C: 1, I: 2, S: 3 };

export interface ItemBanco {
  id: string;
  contexto: Contexto;
  fator: Fator;
  texto: string;
  reverso: boolean;
}

export interface RespostaBruta {
  itemId: string;
  simbolo: Simbolo;
  tempoMs: number;
}

export interface RespostaItem {
  itemId: string;
  contexto: Contexto;
  fator: Fator;
  texto: string;
  reverso: boolean;
  simbolo: Simbolo;
  valorBruto: number;
  valorComputado: number;
  tempoMs: number;
}

export interface EscoreFator {
  fator: Fator;
  contexto: Contexto;
  bruto: number;
  percentual: number;
  percentil: number;
  z: number;
  segmento: number;
  faixa: string;
}

export interface ResultadoPerfil {
  escoresBase: Record<Fator, EscoreFator>;
  escoresExpectativa: Record<Fator, EscoreFator>;
  normaProvisoria: boolean;
  dominante: Fator;
  secundario: Fator | null;
  perfilCombinado: boolean;
  padraoCodigo: string;
  padraoNome: string;
  deltas: Record<Fator, number>;
  itp: number;
  itpClassificacao: ItpClassificacao;
  deltaDirecoes: Record<Fator, DirecaoDelta>;
  qualidade: ResultadoQualidade;
}

export type ItpClassificacao =
  | "convergencia_alta"
  | "tensao_produtiva"
  | "tensao_alta"
  | "tensao_extrema";

export type DirecaoDelta =
  | "pedem_mais"
  | "pedem_menos"
  | "neutro";

export interface ResultadoQualidade {
  sinais: SinalQualidade[];
  qualidadeBaixa: boolean;
  aquiescenciaR: number | null;
  saturacaoConcordancia: number;
  desvioPadrao: number;
  fracaoApressada: number;
  fracaoExtrema: number;
  fracaoRecordacaoFeedback: number;
  ausenciaFeedback: boolean;
  notaDiscreta: string | null;
}

export type SinalQualidade =
  | "aquiescencia_direto_reverso"
  | "saturacao_concordancia"
  | "variacao_baixa"
  | "monotonia"
  | "resposta_apressada"
  | "padrao_extremo";

export interface NormaFator {
  media: number;
  desvio: number;
  n: number;
}

export interface NormaContexto {
  [fator: string]: NormaFator;
}