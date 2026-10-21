import { describe, expect, it } from 'vitest';
import { binarySearch } from '../../../src/algorithms/search/binary';
import { linearSearch } from '../../../src/algorithms/search/linear';
import { makeSearchInput } from '../../../src/algorithms/search/input';
import { runCount } from '../../../src/engine/runner';
import { mulberry32 } from '../../../src/engine/rng';
import { bestFit } from '../../../src/engine/fit';

const sizes = [1, 2, 3, 7, 8, 15, 16, 100, 1000, 1024];

describe('search correctness', () => {
  it('both searches find every present element and reject absent ones', () => {
    for (const n of [1, 2, 5, 16, 33]) {
      const arr = Array.from({ length: n }, (_, i) => 2 * i);
      for (let i = 0; i < n; i++) {
        expect(runCount(linearSearch, { arr, target: 2 * i }).result).toBe(i);
        expect(runCount(binarySearch, { arr, target: 2 * i }).result).toBe(i);
      }
      for (const t of [-1, 1, 2 * n + 1]) {
        expect(runCount(linearSearch, { arr, target: t }).result).toBe(-1);
        expect(runCount(binarySearch, { arr, target: t }).result).toBe(-1);
      }
    }
  });
});

describe('search op counts', () => {
  it('linear search worst case does exactly n compares', () => {
    for (const n of sizes) {
      const input = makeSearchInput(n, 'worst', mulberry32(1));
      expect(runCount(linearSearch, input).counters.ops.compare).toBe(n);
    }
  });

  it('binary search worst case does exactly floor(log2 n) + 1 compares', () => {
    for (const n of sizes) {
      const input = makeSearchInput(n, 'worst', mulberry32(1));
      expect(runCount(binarySearch, input).counters.ops.compare).toBe(Math.floor(Math.log2(n)) + 1);
    }
  });

  it('binary search never exceeds floor(log2 n) + 1 compares on random targets', () => {
    const rng = mulberry32(42);
    for (const n of sizes) {
      for (let k = 0; k < 20; k++) {
        const c = runCount(binarySearch, makeSearchInput(n, 'random', rng)).counters;
        expect(c.ops.compare).toBeLessThanOrEqual(Math.floor(Math.log2(n)) + 1);
      }
    }
  });

  it('both use constant extra memory', () => {
    const input = makeSearchInput(1024, 'worst', mulberry32(1));
    expect(runCount(linearSearch, input).counters.peakMem).toBe(1);
    expect(runCount(binarySearch, input).counters.peakMem).toBe(3);
  });

  it('the fit picks log n for binary search on n = 2^4 … 2^20', () => {
    const pts = Array.from({ length: 17 }, (_, i) => {
      const n = 2 ** (i + 4);
      const c = runCount(binarySearch, makeSearchInput(n, 'worst', mulberry32(1))).counters;
      return { n, y: c.ops.compare };
    });
    expect(bestFit(pts).cls).toBe('logn');
  });
});
