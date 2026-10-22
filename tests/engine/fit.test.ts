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

  describe('exponentials', () => {
    const lin = Array.from({ length: 13 }, (_, i) => 8 + 4 * i);
    it('keeps the named class for exact 2ⁿ and φⁿ data', () => {
      expect(bestFit(lin.map((n) => ({ n: n / 2, y: 3 * 2 ** (n / 2) }))).cls).toBe('exp2');
      expect(bestFit(lin.map((n) => ({ n, y: 1.6180339887 ** n + 5 }))).cls).toBe('expPhi');
    });

    it('fits other bases as O(cⁿ) and extrapolates with the base', () => {
      const fit = bestFit(lin.map((n) => ({ n, y: 40 * 1.2 ** n })));
      expect(fit.cls).toBe('expc');
      expect(fit.base).toBeCloseTo(1.2, 3);
      expect(extrapolate(fit, 100)).toBeCloseTo(40 * 1.2 ** 100, -Math.round(Math.log10(40 * 1.2 ** 100)) + 3);
    });

    it('does not mistake polynomials for gentle exponentials', () => {
      expect(bestFit(lin.map((n) => ({ n, y: n * n }))).cls).toBe('n2');
      expect(bestFit(lin.map((n) => ({ n, y: n ** 3 + 7 }))).cls).toBe('n3');
    });
  });

  it('names constant data O(1), not a class that ties within rounding', () => {
    for (const lin of [[4, 6, 8, 10, 12, 14], [16, 32, 64, 128, 256]]) expect(bestFit(lin.map((n) => ({ n, y: 20 }))).cls).toBe('1');
  });

  it('extrapolates from the fitted coefficients', () => {
    const fit = bestFit(ns.map((n) => ({ n, y: 2 * n })));
    expect(extrapolate(fit, 1e7)).toBeCloseTo(2e7, -1);
  });
});
