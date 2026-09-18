export function media(vals: number[]): number {
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function desvioPadrao(vals: number[]): number {
  if (vals.length === 0) return 0;
  const m = media(vals);
  const soma = vals.reduce((acc, v) => acc + (v - m) ** 2, 0);
  return Math.sqrt(soma / vals.length);
}

/** Correlação de Pearson amostral. Retorna null quando não é definível (variância zero em algum vetor). */
export function pearson(a: number[], b: number[]): number | null {
  if (a.length === 0 || a.length !== b.length) return null;
  const ma = media(a);
  const mb = media(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] - ma;
    const y = b[i] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  const den = Math.sqrt(da * db);
  if (den === 0) return null;
  const r = num / den;
  return Math.min(1, Math.max(-1, r));
}

/** Aproximação de Abramowitz & Stegun 26.2.17 da CDF da normal padrão. */
export function cdfNormalPadrao(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const p =
    d * t *
    (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  if (z > 0) return 1 - p;
  return p;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}