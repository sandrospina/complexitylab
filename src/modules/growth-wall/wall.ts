import { lnFactorial, PHI } from '../../engine/complexity';
import type { FixedClass } from '../../engine/complexity';

export const SECONDS = {
  second: 1,
  day: 86_400,
  // 13.8 billion years
  universe: 13.8e9 * 365.25 * 86_400,
} as const;

/** log10 of the class's cost at n = 10^x, computed without forming n. */
function log10Cost(cls: FixedClass, x: number): number {
  const LOG2_10 = Math.log2(10);
  switch (cls) {
    case '1':
      return 0;
    case 'loglogn':
      return Math.log10(Math.log2(Math.max(x * LOG2_10, 2)));
    case 'logn':
      return Math.log10(x * LOG2_10);
    case 'sqrtn':
      return x / 2;
    case 'n':
      return x;
    case 'nlogn':
      return x + Math.log10(Math.max(x * LOG2_10, 1e-300));
    case 'n2':
      return 2 * x;
    case 'n2logn':
      return 2 * x + Math.log10(Math.max(x * LOG2_10, 1e-300));
    case 'n3':
      return 3 * x;
    case 'quasi':
      // log₁₀(n^log₂ n) = log₂ n · log₁₀ n
      return x * LOG2_10 * x;
    case 'expPhi':
      return 10 ** x * Math.log10(PHI);
    case 'exp2':
      return 10 ** x * Math.log10(2);
    case 'n2exp2':
      return 2 * x + 10 ** x * Math.log10(2);
    case 'fact':
      return lnFactorial(10 ** x) / Math.LN10;
  }
}

/** log10 of the class's cost at an exact integer n (used once n is small enough to form). */
function log10CostAt(cls: FixedClass, n: number): number {
  switch (cls) {
    case 'expPhi':
      return n * Math.log10(PHI);
    case 'exp2':
      return n * Math.log10(2);
    case 'n2exp2':
      return 2 * Math.log10(n) + n * Math.log10(2);
    case 'fact':
      return lnFactorial(n) / Math.LN10;
    default:
      return log10Cost(cls, Math.log10(n));
  }
}

export type WallResult =
  | { kind: 'unbounded' }
  /** Exact largest integer n. */
  | { kind: 'exact'; n: number }
  /** Too large to print: n ≈ 10^log10n. */
  | { kind: 'huge'; log10n: number };

const EXACT_LIMIT = 15;

/** Largest n whose cost f(n) fits in `ops` operations. */
export function largestN(cls: FixedClass, ops: number): WallResult {
  // log log n stays under 6 until n has billions of digits: as good as unbounded.
  if (cls === '1' || cls === 'loglogn') return { kind: 'unbounded' };
  const target = Math.log10(ops);
  const fits = (x: number) => log10Cost(cls, x) <= target;

  let hi = 1;
  while (fits(hi)) hi *= 2;
  let lo = 0;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  if (lo >= EXACT_LIMIT) return { kind: 'huge', log10n: lo };

  // Refine to an exact integer; the float estimate can be one off either way.
  const fitsAt = (n: number) => log10CostAt(cls, n) <= target;
  let n = Math.floor(10 ** lo);
  while (fitsAt(n + 1)) n++;
  while (n > 1 && !fitsAt(n)) n--;
  return { kind: 'exact', n };
}

export function formatWall(r: WallResult): string {
  switch (r.kind) {
    case 'unbounded':
      return 'any n';
    case 'exact':
      return r.n.toLocaleString('en-US');
    case 'huge': {
      const e = r.log10n;
      return e < 1e6 ? `≈ 10^${Math.floor(e).toLocaleString('en-US')}` : `≈ 10^(${e.toExponential(2)})`;
    }
  }
}
