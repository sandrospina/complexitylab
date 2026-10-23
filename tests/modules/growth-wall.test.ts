import { describe, expect, it } from 'vitest';
import { formatWall, largestN } from '../../src/modules/growth-wall/wall';

describe('growth-rate wall', () => {
  it('gives exact n for polynomial and exponential classes at 10^9 ops', () => {
    expect(largestN('n', 1e9)).toEqual({ kind: 'exact', n: 1e9 });
    expect(largestN('n2', 1e9)).toEqual({ kind: 'exact', n: 31_622 });
    expect(largestN('n3', 1e9)).toEqual({ kind: 'exact', n: 1000 });
    expect(largestN('exp2', 1e9)).toEqual({ kind: 'exact', n: 29 });
    expect(largestN('fact', 1e9)).toEqual({ kind: 'exact', n: 12 });
  });

  it('n log n is consistent with its definition', () => {
    const r = largestN('nlogn', 1e9);
    expect(r.kind).toBe('exact');
    const n = (r as { n: number }).n;
    expect(n * Math.log2(n)).toBeLessThanOrEqual(1e9);
    expect((n + 1) * Math.log2(n + 1)).toBeGreaterThan(1e9);
  });

  it('φⁿ allows more n than 2ⁿ, and n² log n less than n²', () => {
    expect(largestN('expPhi', 1e9)).toEqual({ kind: 'exact', n: 43 });
    const r = largestN('n2logn', 1e9);
    expect(r.kind).toBe('exact');
    const n = (r as { n: number }).n;
    expect(n * n * Math.log2(n)).toBeLessThanOrEqual(1e9);
    expect((n + 1) * (n + 1) * Math.log2(n + 1)).toBeGreaterThan(1e9);
    expect(n).toBeLessThan(31_622);
  });

  it('n²·2ⁿ fits 21 where 2ⁿ fits 29 at 10^9 ops', () => {
    expect(largestN('n2exp2', 1e9)).toEqual({ kind: 'exact', n: 21 });
  });

  it('√n squares the budget', () => {
    expect(largestN('sqrtn', 1e9)).toEqual({ kind: 'huge', log10n: expect.closeTo(18, 6) });
    expect(largestN('sqrtn', 1e6)).toEqual({ kind: 'exact', n: 1e12 });
  });

  it('log n and constant are effectively unbounded', () => {
    expect(largestN('1', 1e9).kind).toBe('unbounded');
    expect(largestN('loglogn', 1e9).kind).toBe('unbounded');
    const r = largestN('logn', 1e9);
    expect(r.kind).toBe('huge');
    expect(formatWall(r)).toMatch(/^≈ 10\^/);
  });

  it('exponential classes barely move from a second to the age of the universe', () => {
    const universe = 1e9 * 13.8e9 * 365.25 * 86_400;
    expect(largestN('exp2', universe)).toEqual({ kind: 'exact', n: 88 });
    expect((largestN('fact', universe) as { n: number }).n).toBeLessThan(30);
  });
});
