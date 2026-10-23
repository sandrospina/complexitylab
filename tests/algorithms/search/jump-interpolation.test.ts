import { describe, expect, it } from 'vitest';
import { makeSearchInput, SEARCH_INPUT_KINDS } from '../../../src/algorithms/search/input';
import { interpolationSearch } from '../../../src/algorithms/search/interpolation';
import { jumpSearch } from '../../../src/algorithms/search/jump';
import { mulberry32 } from '../../../src/engine/rng';
import { runCount } from '../../../src/engine/runner';

const SEARCHES = [
  ['jump', jumpSearch],
  ['interpolation', interpolationSearch],
] as const;
const compares = (algo: typeof jumpSearch, arr: number[], target: number) => runCount(algo, { arr, target }).counters.ops.compare;

describe.each(SEARCHES)('%s search', (_name, algo) => {
  it('finds every element and rejects absent targets, on every input kind', () => {
    const rng = mulberry32(4);
    for (const kind of SEARCH_INPUT_KINDS)
      for (const n of [1, 2, 3, 5, 16, 17, 100]) {
        const { arr } = makeSearchInput(n, kind.id, rng);
        arr.forEach((v, i) => expect(runCount(algo, { arr, target: v }).result).toBe(i));
        for (const t of [arr[0]! - 1, arr.at(-1)! + 1, ...arr.slice(1).map((v, i) => (v - arr[i]! > 1 ? v - 1 : NaN)).filter(Number.isFinite)])
          expect(runCount(algo, { arr, target: t }).result).toBe(-1);
      }
  });
});

describe('search op counts', () => {
  it('jump search: ⌈n/m⌉ − 1 jumps then a block of m, with m = ⌊√n⌋', () => {
    // n = 16, target above all: jumps at 3, 7, 11, then scans 12..15.
    expect(compares(jumpSearch, makeSearchInput(16, 'worst', mulberry32(1)).arr, 99)).toBe(3 + 4);
    for (const n of [25, 100, 1024, 10_000]) {
      const m = Math.floor(Math.sqrt(n));
      expect(compares(jumpSearch, makeSearchInput(n, 'worst', mulberry32(1)).arr, 2 * n + 1)).toBe(Math.ceil(n / m) - 1 + (n - m * (Math.ceil(n / m) - 1)));
      expect(compares(jumpSearch, makeSearchInput(n, 'worst', mulberry32(1)).arr, 2 * n + 1)).toBeLessThanOrEqual(2 * Math.sqrt(n) + 1);
    }
  });

  it('interpolation search: one exact guess on evenly spaced values, n − 1 on the skewed array', () => {
    for (const n of [16, 1000, 2 ** 16]) {
      const even = makeSearchInput(n, 'random', mulberry32(3));
      // A range check and one probe that lands on the target.
      expect(compares(interpolationSearch, even.arr, even.target)).toBe(2);
      expect(compares(interpolationSearch, even.arr, 2 * n + 1)).toBe(1);
      const skewed = makeSearchInput(n, 'skewed', mulberry32(3));
      // Each guess lands on lo, one place along: n − 1 probes, each with its range check.
      expect(compares(interpolationSearch, skewed.arr, skewed.target)).toBe(2 * (n - 1));
    }
  });

  it('interpolation search on spread values needs a handful of probes even at a million', () => {
    const rng = mulberry32(8);
    let total = 0;
    for (let k = 0; k < 50; k++) {
      const { arr, target } = makeSearchInput(2 ** 20, 'uniform', rng);
      total += compares(interpolationSearch, arr, target);
    }
    // Binary search needs about 20 compares here; interpolation, range checks included, stays under 10.
    expect(total / 50).toBeLessThan(10);
  });
});
