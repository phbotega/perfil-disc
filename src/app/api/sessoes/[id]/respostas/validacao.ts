import { SIMBOLOS } from "@/lib/core/escala";
import type { Simbolo } from "@/lib/core/tipos";

export function validaSimbolo(valor: string | undefined): Simbolo | null {
  if (!valor) return null;
  return SIMBOLOS.includes(valor as Simbolo) ? (valor as Simbolo) : null;
}