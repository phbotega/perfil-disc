import { clamp } from "./estatistica";
import { FATORES } from "./tipos";
import type { Fator } from "./tipos";
import adjetivosV1 from "../../../content/gradiente/adjetivos-v1.json";

type AdjetivosJson = typeof adjetivosV1;

const COLUNA = (adjetivosV1 as AdjetivosJson).linhas;

export interface GradienteFator {
  fator: Fator;
  adjetivos: string[];
  posicaoBase: number;
  posicaoExpectativa: number;
}

/**
 * Coluna de 12 adjetivos do alto (posição 0) para o baixo (posição 11).
 * O marcador da pessoa fica na altura do percentil correspondente:
 * percentil 0 cola no topo da coluna (posição 0 = mais alto no traço).
 */
export function gradienteDoFator(
  fator: Fator,
  percentilBase: number,
  percentilExpectativa: number,
): GradienteFator {
  const adjetivos = COLUNA.map((linha) => linha[fator]);
  const posicaoBase = clamp(Math.round((1 - percentilBase / 100) * 11), 0, 11);
  const posicaoExpectativa = clamp(
    Math.round((1 - percentilExpectativa / 100) * 11),
    0,
    11,
  );
  return { fator, adjetivos, posicaoBase, posicaoExpectativa };
}

export function gradientesCompletos(
  percentisBase: Record<Fator, number>,
  percentisExpectativa: Record<Fator, number>,
): GradienteFator[] {
  return FATORES.map((fator) =>
    gradienteDoFator(fator, percentisBase[fator], percentisExpectativa[fator]),
  );
}