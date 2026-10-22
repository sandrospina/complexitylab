import { describe, expect, it } from 'vitest';
import { replayArray } from '../../../src/algorithms/sort/replay';
import { tspBrute } from '../../../src/algorithms/tsp/brute';
import { tspHeldKarp } from '../../../src/algorithms/tsp/held-karp';
import { tspHeuristic } from '../../../src/algorithms/tsp/heuristic';
import { makeTspInput, tourCost } from '../../../src/algorithms/tsp/input';
import type { TspResult } from '../../../src/algorithms/tsp/input';
import { mulberry32 } from '../../../src/engine/rng';
import { runCount, runTrace } from '../../../src/engine/runner';

const isTour = (r: TspResult, n: number) => {
  expect(r.tour[0]).toBe(0);
  expect([...r.tour].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i));
};

describe('TSP', () => {
  it('brute force and Held–Karp find the same optimum for n ≤ 9', () => {
    for (let n = 1; n <= 9; n++) {
      for (const seed of [1, 2, 3]) {
        const input = makeTspInput(n, 'random', mulberry32(seed * 10 + n));
        const brute = runCount(tspBrute, input).result!;
        const hk = runCount(tspHeldKarp, input).result!;
        isTour(brute, n);
        isTour(hk, n);
        expect(hk.cost).toBeCloseTo(brute.cost, 9);
        expect(tourCost(input.pts, hk.tour)).toBeCloseTo(hk.cost, 9);
      }
    }
  });

  it('the heuristic tour is valid and never beats the optimum', () => {
    for (let n = 4; n <= 12; n++) {
      const input = makeTspInput(n, 'random', mulberry32(n));
      const h = runCount(tspHeuristic, input).result!;
      isTour(h, n);
      expect(tourCost(input.pts, h.tour)).toBeCloseTo(h.cost, 9);
      expect(h.cost).toBeGreaterThanOrEqual(runCount(tspHeldKarp, input).result!.cost - 1e-9);
    }
  });

  it('2-opt only ever shortens the nearest-neighbour tour', () => {
    const input = makeTspInput(40, 'random', mulberry32(7));
    const t = runTrace(tspHeuristic, input, { maxSteps: 1e6 });
    const costs = t.steps.flatMap((s) => (s.event.op === 'mark' ? [(s.event.snapshot as { best: number }).best] : []));
    for (let k = 1; k < costs.length; k++) expect(costs[k]).toBeLessThanOrEqual(costs[k - 1]! + 1e-12);
    // Replaying the indexed writes and swaps rebuilds the final tour.
    expect(replayArray(Array(40).fill(-1), t.steps, t.steps.length)).toEqual(t.result!.tour);
  });

  it('brute force costs n reads and a compare per tour, and stops at its budget', () => {
    const input = makeTspInput(6, 'random', mulberry32(1));
    // 5! tours, each n reads + 1 compare, plus one swap per tour after the first.
    expect(runCount(tspBrute, input).counters.totalOps).toBe(120 * 7 + 119);
    const big = runCount(tspBrute, makeTspInput(13, 'random', mulberry32(1)), { budget: { maxOps: 1e5 } });
    expect(big.truncated).toBe(true);
  });

  it('Held–Karp on 4 cities fills its table with known counts', () => {
    const c = runCount(tspHeldKarp, makeTspInput(4, 'random', mulberry32(1))).counters;
    // 3 cities besides 0: for each set S and end j ∈ S, one read and |S̄| compares; then 3 closing compares.
    expect(c.ops.read).toBe(12);
    expect(c.ops.compare).toBe(12 + 3);
    expect(c.peakMem).toBe(2 * 8 * 3);
  });
});
