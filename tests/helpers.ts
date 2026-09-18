import { listarItems } from "../src/lib/core/banco";
import { responder } from "../src/lib/core/relatorio";
import type { Contexto, Fator, RespostaBruta, Simbolo } from "../src/lib/core/tipos";

export interface ConfigFator {
  diretos: Simbolo;
  reversos: Simbolo;
}

/** Monta uma resposta por item a partir da configuração opcional por fator; o resto fica em '='. */
export function montarPerfil(
  base: Partial<Record<Fator, ConfigFator>>,
  expectativa: Partial<Record<Fator, ConfigFator>>,
  tempoMs = 4000,
): RespostaBruta[] {
  return listarItems().map((item) => {
    const config = item.contexto === "base" ? base[item.fator] : expectativa[item.fator];
    const simbolo = config ? (item.reverso ? config.reversos : config.diretos) : "=";
    return responder(item.id, simbolo, tempoMs);
  });
}

export function montarSessao(
  config: Record<Contexto, Record<Fator, { diretos: Simbolo; reversos: Simbolo }>>,
  tempoMs = 4000,
): RespostaBruta[] {
  return listarItems().map((item) => {
    const c = config[item.contexto][item.fator];
    const simbolo = item.reverso ? c.reversos : c.diretos;
    return responder(item.id, simbolo, tempoMs);
  });
}

export function todos(simbolo: Simbolo, tempoMs = 4000): RespostaBruta[] {
  return listarItems().map((item) => responder(item.id, simbolo, tempoMs));
}