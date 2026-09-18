import type { Simbolo } from "./tipos";

export const ESCALA: { simbolo: Simbolo; valor: number }[] = [
  { simbolo: "++", valor: 5 },
  { simbolo: "+", valor: 4 },
  { simbolo: "=", valor: 3 },
  { simbolo: "-", valor: 2 },
  { simbolo: "--", valor: 1 },
];

export const VALOR_POR_SIMBOLO: Record<Simbolo, number> = {
  "++": 5,
  "+": 4,
  "=": 3,
  "-": 2,
  "--": 1,
};

export const SIMBOLOS: Simbolo[] = ["++", "+", "=", "-", "--"];

/** Item reverso: escore computado é 6 menos o valor bruto. */
export function valorComputado(valorBruto: number, reverso: boolean): number {
  return reverso ? 6 - valorBruto : valorBruto;
}

export function valorBrutoDeSimbolo(simbolo: Simbolo): number {
  return VALOR_POR_SIMBOLO[simbolo];
}