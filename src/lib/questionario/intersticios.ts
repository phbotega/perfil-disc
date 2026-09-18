import { FATORES } from "@/lib/core/tipos";
import type { Fator } from "@/lib/core/tipos";

export interface RespostaLinha {
  fator: Fator;
  valorComputado: number;
}

/** Concordância real da sessão por fator (base). Nunca inventa estatística populacional. */
export function concordanciaPorFator(
  linhas: RespostaLinha[],
): Record<Fator, number> {
  const resultado = {
    D: 0,
    I: 0,
    S: 0,
    C: 0,
  } as Record<Fator, number>;
  for (const linha of linhas) {
    if (linha.valorComputado >= 4) resultado[linha.fator] += 1;
  }
  return resultado;
}

export function fatorMaisForte(linhas: RespostaLinha[]): Fator | null {
  let max = -1;
  let melhor: Fator | null = null;
  for (const fator of FATORES) {
    const n = concordanciaPorFator(linhas)[fator];
    if (n > max) {
      max = n;
      melhor = fator;
    }
  }
  return max > 0 ? melhor : null;
}

const NOME_DOS_FATORES: Record<Fator, string> = {
  D: "direção e decisão",
  I: "comunicação e contato com pessoas",
  S: "paciência e constância",
  C: "rigor e método",
};

/**
 * Interstício após o item 16 (metade do bloco de base).
 * Usa apenas os dados da própria sessão, em linguagem qualitativa.
 */
export function mensagemApos16(base: RespostaLinha[]): { titulo: string; corpo: string } {
  const dominante = fatorMaisForte(base);
  if (!dominante) {
    return {
      titulo: "Metade da primeira etapa",
      corpo:
        "Você respondeu metade das afirmações sobre como é no dia a dia. Continue no mesmo ritmo — cada resposta afina o retrato de quem você é.",
    };
  }
  const total = base.filter((l) => l.valorComputado >= 4).length;
  if (total <= 1) {
    return {
      titulo: "Metade da primeira etapa",
      corpo:
        "Até aqui você se reconheceu em poucas afirmações. Isso também é informação. Siga como está — o retrato completo aparece ao final.",
    };
  }
  return {
    titulo: "Um primeiro contorno",
    corpo: `Até aqui, o que você respondeu aponta para ${NOME_DOS_FATORES[dominante]} como traço mais presente. Mais 16 afirmações e cruzamos com o que o ambiente pede de você.`,
  };
}

/**
 * Interstício após o item 40 (oito itens do bloco de expectativa).
 * O que o entorno já pediu que a pessoa aumentasse, qualitativamente.
 */
export function mensagemApos40(
  expectativa: RespostaLinha[],
): { titulo: string; corpo: string } {
  const concordados = expectativa.filter((l) => l.valorComputado >= 4);
  if (concordados.length === 0) {
    return {
      titulo: "O que já pediram de você",
      corpo:
        "Nos itens deste bloco você não lembrou retornos que já tenha recebido. Isso tem três leituras possíveis e o relatório completo cuida de cada uma.",
    };
  }
  const contagens = concordanciaPorFator(expectativa);
  const max = Math.max(...FATORES.map((f) => contagens[f]));
  const lideres = FATORES.filter((f) => contagens[f] === max);
  const nomes = lideres.map((f) => NOME_DOS_FATORES[f]);
  const pedido =
    lideres.length === 1
      ? nomes[0]
      : `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
  return {
    titulo: "O que o entorno pede",
    corpo: `Entre os retornos que você lembra, a demanda mais recorrente é por ${pedido}. Faltam 24 afirmações para a fotografia completa.`,
  };
}

export function mensagemFinal(): { titulo: string; corpo: string } {
  return {
    titulo: "Você respondeu as 64 afirmações",
    corpo:
      "Em instantes cruzamos quem você é com o que pedem de você. A distância entre os dois é o que diferencia este relatório.",
  };
}