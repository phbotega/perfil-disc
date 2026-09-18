/** Registro dos 16 padrões: 4 puros e 12 combinados (primário + secundário). */
export const PADROES: Record<string, string> = {
  D: "O Executor",
  DI: "O Persuasor",
  DS: "O Condutor",
  DC: "O Estrategista",
  I: "O Comunicador",
  ID: "O Inspirador",
  IS: "O Conselheiro",
  IC: "O Avaliador",
  S: "O Apoiador",
  SD: "O Realizador",
  SI: "O Harmonizador",
  SC: "O Especialista",
  C: "O Analista",
  CD: "O Perfeccionista",
  CI: "O Articulador",
  CS: "O Guardião",
};

export function nomeDoPadrao(codigo: string): string {
  const nome = PADROES[codigo];
  if (!nome) throw new Error(`Padrão desconhecido: ${codigo}`);
  return nome;
}

export function codigosDePadrao(): string[] {
  return Object.keys(PADROES);
}