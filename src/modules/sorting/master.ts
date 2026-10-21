/** T(n) = a·T(n/b) + Θ(n^k) */
export interface Recurrence {
  a: number;
  b: number;
  k: number;
}

export interface MasterResult {
  case: 1 | 2 | 3;
  /** log_b a, the exponent the leaves contribute. */
  critical: number;
  /** The Θ bound, as TeX. */
  bound: string;
  /** Why this case applies, as TeX. */
  reason: string;
}

const EPS = 1e-9;

const num = (x: number) => (Math.abs(x - Math.round(x)) < EPS ? String(Math.round(x)) : x.toFixed(2));

function power(k: number): string {
  if (Math.abs(k) < EPS) return '1';
  if (Math.abs(k - 1) < EPS) return 'n';
  return `n^{${num(k)}}`;
}

export function recurrenceTex({ a, b, k }: Recurrence): string {
  const calls = a === 1 ? `T(n/${b})` : `${a}\\,T(n/${b})`;
  return `T(n) = ${calls} + \\Theta(${power(k)})`;
}

export function masterTheorem({ a, b, k }: Recurrence): MasterResult {
  const critical = Math.log(a) / Math.log(b);
  const crit = `\\log_{${b}} ${a} = ${num(critical)}`;
  if (k < critical - EPS) {
    return { case: 1, critical, bound: `\\Theta(${power(critical)})`, reason: `${num(k)} < ${crit}` };
  }
  if (k > critical + EPS) {
    return { case: 3, critical, bound: `\\Theta(${power(k)})`, reason: `${num(k)} > ${crit}` };
  }
  const p = power(k);
  return {
    case: 2,
    critical,
    bound: `\\Theta(${p === '1' ? '' : `${p} `}\\log n)`,
    reason: `${num(k)} = ${crit}`,
  };
}
