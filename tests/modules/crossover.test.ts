import { describe, expect, it } from 'vitest';
import { bestFit } from '../../src/engine/fit';
import { findCrossover } from '../../src/modules/graphs/crossover';

const ns = [16, 32, 64, 128, 256, 512, 1024];
const pts = (f: (n: number) => number) => ns.map((n) => ({ n, ops: f(n) }));
const fit = (p: { n: number; ops: number }[]) => bestFit(p.map((x) => ({ n: x.n, y: x.ops })));

describe('Dijkstra crossover', () => {
  it('interpolates a crossing between measured sizes', () => {
    const array = pts((n) => n * n);
    const heap = pts((n) => 20 * n * Math.log2(n));
    const c = findCrossover(array, heap);
    expect(c?.kind).toBe('measured');
    // n² = 20 n log₂ n near n ≈ 143.
    expect((c as { n: number }).n).toBeGreaterThan(128);
    expect((c as { n: number }).n).toBeLessThan(160);
  });

  it('extrapolates from the fits when the array wins every measured size', () => {
    const array = pts((n) => n * n);
    const heap = pts((n) => 200 * n * Math.log2(n));
    const c = findCrossover(array, heap, fit(array), fit(heap));
    expect(c?.kind).toBe('extrapolated');
    expect((c as { n: number }).n).toBeGreaterThan(1024);
  });

  it('reports that n² log n never catches n²', () => {
    const array = pts((n) => n * n);
    const heap = pts((n) => n * n * Math.log2(n));
    expect(findCrossover(array, heap, fit(array), fit(heap))).toEqual({ kind: 'never' });
  });

  it('reports a heap that wins from the start', () => {
    expect(findCrossover(pts((n) => n * n), pts((n) => n))).toEqual({ kind: 'heap-always' });
    expect(findCrossover([], [])).toBeUndefined();
  });
});
