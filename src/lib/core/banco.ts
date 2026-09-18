import { CONTEXTOS, FATORES } from "./tipos";
import type { Contexto, Fator, ItemBanco } from "./tipos";
import bancoV1 from "../../../content/itens/banco-v1.json";

type BancoJson = typeof bancoV1;

function carregarItems(): ItemBanco[] {
  const json = bancoV1 as BancoJson;
  const items: ItemBanco[] = [];
  for (const contexto of CONTEXTOS) {
    const ctx = json.contextos[contexto];
    for (const fator of FATORES) {
      const lista = ctx.fatores[fator];
      for (const it of lista) {
        items.push({
          id: it.id,
          contexto,
          fator,
          texto: it.texto,
          reverso: it.reverso,
        });
      }
    }
  }
  return items;
}

const ITENS = carregarItems();
const POR_ID = new Map<string, ItemBanco>(ITENS.map((i) => [i.id, i]));

export const BANCO_VERSAO = bancoV1.versao;

export function obterItem(id: string): ItemBanco {
  const item = POR_ID.get(id);
  if (!item) throw new Error(`Item desconhecido: ${id}`);
  return item;
}

export function listarItems(): ItemBanco[] {
  return ITENS;
}

export function listarItemsPorContexto(contexto: Contexto): ItemBanco[] {
  return ITENS.filter((i) => i.contexto === contexto);
}

export function molduraDoContexto(contexto: Contexto): string {
  const json = bancoV1 as BancoJson;
  return json.contextos[contexto].moldura;
}

export function totalDeItens(): number {
  return ITENS.length;
}

export function contarReversos(): number {
  return ITENS.filter((i) => i.reverso).length;
}

export function obterFator(id: string): Fator {
  return obterItem(id).fator;
}

export function obterContexto(id: string): Contexto {
  return obterItem(id).contexto;
}

export function obterReverso(id: string): boolean {
  return obterItem(id).reverso;
}