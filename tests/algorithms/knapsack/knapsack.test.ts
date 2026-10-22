import { describe, expect, it } from 'vitest';
import { knapsackBrute } from '../../../src/algorithms/knapsack/brute';
import { knapsackDp } from '../../../src/algorithms/knapsack/dp';
import { makeKnapsackInput } from '../../../src/algorithms/knapsack/input';
import type { KnapsackInput, KnapsackResult } from '../../../src/algorithms/knapsack/input';
import { mulberry32, randInt } from '../../../src/engine/rng';
import { runCount } from '../../../src/engine/runner';

/** Uninstrumented reference: the best value over all subsets, by recursion. */
function reference({ w, v, W }: KnapsackInput, i = 0): number {
  if (i === w.length) return 0;
  const skip = reference({ w, v, W }, i + 1);
  return w[i]! <= W ? Math.max(skip, v[i]! + reference({ w, v, W: W - w[i]! }, i + 1)) : skip;
}

const solves = (input: KnapsackInput, r: KnapsackResult) => {
  expect(r.best).toBe(reference(input));
  expect(new Set(r.items).size).toBe(r.items.length);
  expect(r.items.reduce((s, i) => s + input.w[i]!, 0)).toBeLessThanOrEqual(input.W);
  expect(r.items.reduce((s, i) => s + input.v[i]!, 0)).toBe(r.best);
};

describe('0/1 knapsack', () => {
  it('brute force and DP agree with the reference, and their items reach the optimum', () => {
    const rng = mulberry32(8);
    for (let k = 0; k < 60; k++) {
      const n = randInt(rng, 0, 11);
      const input: KnapsackInput = {
        w: Array.from({ length: n }, () => randInt(rng, 1, 20)),
        v: Array.from({ length: n }, () => randInt(rng, 1, 30)),
        W: randInt(rng, 0, 50),
      };
      solves(input, runCount(knapsackBrute, input).result!);
      solves(input, runCount(knapsackDp, input).result!);
    }
  });

  it('brute force does 4 ops per subset whatever W is', () => {
    const small = { w: [3, 4, 5, 6], v: [1, 2, 3, 4], W: 5 };
    expect(runCount(knapsackBrute, small).counters.totalOps).toBe(4 * (2 ** 4 - 1));
    expect(runCount(knapsackBrute, { ...small, W: 5_000_000 }).counters.totalOps).toBe(4 * (2 ** 4 - 1));
  });

  it('adding a bit to W doubles the DP table, not the brute-force work', () => {
    const rng = mulberry32(2);
    const a = makeKnapsackInput(8, 'bits', rng);
    const b = makeKnapsackInput(9, 'bits', rng);
    const dp = (x: KnapsackInput) => runCount(knapsackDp, x).counters;
    expect(dp(a).peakMem).toBe(11 * 2 ** 8);
    expect(dp(b).peakMem).toBe(11 * 2 ** 9);
    expect(runCount(knapsackBrute, a).counters.totalOps).toBe(runCount(knapsackBrute, b).counters.totalOps);
  });
});
