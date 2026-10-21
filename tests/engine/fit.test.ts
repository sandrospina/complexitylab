import { describe, expect, it } from 'vitest';
import { bestFit, extrapolate, fitAll } from '../../src/engine/fit';

const ns = Array.from({ length: 17 }, (_, i) => 2 ** (i + 4));

describe('fit', () => {
  it('identifies log n', () => {
    const pts = ns.map((n) => ({ n, y: Math.floor(Math.log2(n)) + 1 }));
    expect(bestFit(pts).cls).toBe('logn');
  });

  it('identifies n', () => {
    expect(bestFit(ns.map((n) => ({ n, y: 3 * n + 2 }))).cls).toBe('n');
  });

  it('identifies n log n and n²', () => {
    const small = Array.from({ length: 10 }, (_, i) => 2 ** (i + 3));
    expect(bestFit(small.map((n) => ({ n, y: n * Math.log2(n) }))).cls).toBe('nlogn');
    expect(bestFit(small.map((n) => ({ n, y: (n * (n - 1)) / 2 }))).cls).toBe('n2');
  });

  it('identifies 2^n and skips classes that overflow', () => {
    const pts = Array.from({ length: 15 }, (_, i) => ({ n: i + 5, y: 2 ** (i + 5) }));
    expect(bestFit(pts).cls).toBe('exp2');
    const big = ns.map((n) => ({ n, y: n }));
    expect(fitAll(big).some((f) => f.cls === 'exp2')).toBe(false);
  });

  it('extrapolates from the fitted coefficients', () => {
    const fit = bestFit(ns.map((n) => ({ n, y: 2 * n })));
    expect(extrapolate(fit, 1e7)).toBeCloseTo(2e7, -1);
  });
});
