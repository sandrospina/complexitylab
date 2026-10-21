import { describe, expect, it } from 'vitest';
import { fibIterative } from '../../../src/algorithms/fib/iterative';
import { fibMemo, fibNaive } from '../../../src/algorithms/fib/recursive';
import { buildCallTree } from '../../../src/engine/calltree';
import { runCount, runTrace } from '../../../src/engine/runner';

const reference = (n: number) => {
  let [a, b] = [0n, 1n];
  for (let k = 0; k < n; k++) [a, b] = [b, a + b];
  return a;
};
const calls = (n: number) => 2 * Number(reference(n + 1)) - 1;

describe('Fibonacci', () => {
  it('all three agree with the reference', () => {
    for (let n = 0; n <= 20; n++) expect(runCount(fibNaive, { n }).result).toBe(reference(n));
    for (let n = 0; n <= 90; n++) {
      expect(runCount(fibMemo, { n }).result).toBe(reference(n));
      expect(runCount(fibIterative, { n }).result).toBe(reference(n));
    }
  });

  it('naive makes 2·fib(n+1) − 1 calls, n deep, and no table', () => {
    const c = runCount(fibNaive, { n: 10 }).counters;
    expect(c.ops.pushFrame).toBe(177);
    expect(c.ops.pushFrame).toBe(calls(10));
    // A compare per call, plus two reads and a write per internal call.
    expect(c.totalOps).toBe(177 + 3 * 88);
    expect(c.peakStack).toBe(10);
    expect(c.peakMem).toBe(0);
  });

  it('memo makes 2n − 1 ≤ 2n calls and spends n + 1 cells', () => {
    for (const n of [1, 2, 5, 10, 40]) {
      const c = runCount(fibMemo, { n }).counters;
      expect(c.ops.pushFrame).toBe(2 * n - 1);
      expect(c.peakMem).toBe(n + 1);
      expect(c.peakStack).toBe(n);
      expect(c.memCells).toBe(0);
    }
  });

  it('iterative uses two cells and no frames', () => {
    const c = runCount(fibIterative, { n: 30 }).counters;
    expect(c.totalOps).toBe(3 * 29);
    expect(c.peakMem).toBe(2);
    expect(c.peakStack).toBe(0);
  });

  it('the memo call tree is the naive tree with every repeated subtree cut to a leaf', () => {
    const naive = buildCallTree(runTrace(fibNaive, { n: 8 }).steps);
    const memo = buildCallTree(runTrace(fibMemo, { n: 8 }).steps);
    expect(naive).toHaveLength(67);
    expect(memo).toHaveLength(15);
    // Pre-order labels of the memo tree follow the naive tree's left spine, then cached right calls.
    expect(memo.map((x) => x.label).slice(0, 8)).toEqual(['fib(8)', 'fib(7)', 'fib(6)', 'fib(5)', 'fib(4)', 'fib(3)', 'fib(2)', 'fib(1)']);
  });

  it('naive stops cleanly at the op budget', () => {
    const r = runCount(fibNaive, { n: 60 }, { budget: { maxOps: 1e5 } });
    expect(r.truncated).toBe(true);
    expect(r.result).toBeUndefined();
  });
});
