import { extrapolate } from '../../engine/fit';
import type { Fit } from '../../engine/fit';

export type Crossover =
  /** The heap is cheaper at every measured n. */
  | { kind: 'heap-always' }
  /** The heap becomes cheaper between two measured sizes. */
  | { kind: 'measured'; n: number }
  /** The array wins every measured n, but the fitted curves cross further out. */
  | { kind: 'extrapolated'; n: number }
  /** The array wins every measured n, and the fits never cross. */
  | { kind: 'never' };

interface Pt {
  n: number;
  ops: number;
}

const EXTRAPOLATE_TO = 1e7;

/**
 * Where heap Dijkstra overtakes the array version. Between measured sizes the crossing is
 * interpolated on log n by the log of the cost ratio; beyond them it comes from the fits.
 */
export function findCrossover(array: Pt[], heap: Pt[], arrayFit?: Fit, heapFit?: Fit): Crossover | undefined {
  const pairs = array.flatMap((a) => {
    const h = heap.find((p) => p.n === a.n);
    return h ? [{ n: a.n, r: Math.log(h.ops / a.ops) }] : [];
  });
  if (pairs.length === 0) return undefined;
  const lastArrayWin = pairs.findLastIndex((p) => p.r >= 0);
  if (lastArrayWin === -1) return { kind: 'heap-always' };
  if (lastArrayWin < pairs.length - 1) {
    const a = pairs[lastArrayWin]!;
    const b = pairs[lastArrayWin + 1]!;
    const t = a.r / (a.r - b.r);
    return { kind: 'measured', n: Math.round(Math.exp(Math.log(a.n) + t * (Math.log(b.n) - Math.log(a.n)))) };
  }
  if (!arrayFit || !heapFit) return undefined;
  const heapWins = (n: number) => extrapolate(heapFit, n) < extrapolate(arrayFit, n);
  let lo = pairs.at(-1)!.n;
  let hi = lo;
  while (!heapWins(hi)) {
    if (hi >= EXTRAPOLATE_TO) return { kind: 'never' };
    lo = hi;
    hi *= 2;
  }
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (heapWins(mid)) hi = mid;
    else lo = mid;
  }
  return { kind: 'extrapolated', n: hi };
}
