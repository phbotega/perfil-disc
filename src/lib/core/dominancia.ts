import { PRECEDENCIA } from "./tipos";
import type { EscoreFator, Fator } from "./tipos";

export interface PadraoResolvido {
  dominante: Fator;
  secundario: Fator | null;
  perfilCombinado: boolean;
  codigo: string;
}

export const LIMITE_COMBINADO = 8;

/**
 * Fator dominante: maior percentil no contexto base.
 * Desempate: maior escore bruto, depois maior percentil no contexto
 * expectativa, depois precedência D > C > I > S.
 */
export function fatorDominante(
  base: Record<Fator, EscoreFator>,
  expectativa: Record<Fator, EscoreFator>,
): Fator {
  return ordenarFatores(base, expectativa)[0];
}

function ordenarFatores(
  base: Record<Fator, EscoreFator>,
  expectativa: Record<Fator, EscoreFator>,
): Fator[] {
  return (Object.keys(base) as Fator[]).sort((a, b) => {
    const pa = base[a].percentil;
    const pb = base[b].percentil;
    if (pb !== pa) return pb - pa;
    const ra = base[a].bruto;
    const rb = base[b].bruto;
    if (rb !== ra) return rb - ra;
    const ea = expectativa[a].percentil;
    const eb = expectativa[b].percentil;
    if (eb !== ea) return eb - ea;
    return PRECEDENCIA[a] - PRECEDENCIA[b];
  });
}

/**
 * Se o segundo fator ficar a menos de LIMITE_COMBINADO pontos percentuais do
 * primeiro, o perfil é combinado e recebe o padrão de dois fatores (primário +
 * secundário). Caso contrário o padrão é puro.
 */
export function resolverPadrao(
  base: Record<Fator, EscoreFator>,
  expectativa: Record<Fator, EscoreFator>,
): PadraoResolvido {
  const ordenados = ordenarFatores(base, expectativa);
  const dominante = ordenados[0];
  const segundo = ordenados[1];
  const distancia = base[dominante].percentil - base[segundo].percentil;
  const combinado = distancia < LIMITE_COMBINADO;
  return {
    dominante,
    secundario: combinado ? segundo : null,
    perfilCombinado: combinado,
    codigo: combinado ? `${dominante}${segundo}` : dominante,
  };
}