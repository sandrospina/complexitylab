import { describe, expect, it } from 'vitest';
import { cycleFloyd } from '../../../src/algorithms/cycle/floyd';
import { cycleHash } from '../../../src/algorithms/cycle/hash';
import { CYCLE_KINDS, makeCycleInput, makeRho } from '../../../src/algorithms/cycle/input';
import { mulberry32 } from '../../../src/engine/rng';
import { runCount } from '../../../src/engine/runner';

/** The first k ≥ 1 with k ≥ μ and λ | k: where the hare catches the tortoise. */
const meet = (mu: number, lambda: number) => {
  let k = Math.max(1, mu);
  while (k % lambda !== 0) k++;
  return k;
};

describe('cycle detection', () => {
  it('both find the tail and loop lengths of every ρ', () => {
    const rng = mulberry32(3);
    for (let mu = 0; mu <= 12; mu++)
      for (let lambda = 1; lambda <= 12; lambda++) {
        const input = makeRho(mu, lambda, rng);
        expect(runCount(cycleHash, input).result).toEqual({ mu, lambda });
        expect(runCount(cycleFloyd, input).result).toEqual({ mu, lambda });
      }
  });

  it('the hash set remembers every value; Floyd keeps four cells whatever n is', () => {
    for (const kind of CYCLE_KINDS)
      for (const n of [1, 10, 1000]) {
        const input = makeCycleInput(n, kind.id, mulberry32(n));
        expect(runCount(cycleHash, input).counters.peakMem).toBe(n);
        expect(runCount(cycleFloyd, input).counters.peakMem).toBe(4);
      }
  });

  it('pins the op counts: one lookup, insert and step per value for the hash set; three phases for Floyd', () => {
    for (const [mu, lambda] of [[0, 1], [5, 5], [9, 1], [0, 12], [3, 7], [20, 6]] as const) {
      const input = makeRho(mu, lambda, mulberry32(1));
      const n = mu + lambda;
      // n rounds of compare + write + read, then the compare that finds the repeat.
      expect(runCount(cycleHash, input).counters.totalOps).toBe(3 * n + 1);
      const k = meet(mu, lambda);
      const c = runCount(cycleFloyd, input).counters;
      expect(c.ops.read).toBe(3 * k + 2 * mu + lambda);
      expect(c.ops.compare).toBe(k + (mu + 1) + lambda);
      expect(c.totalOps).toBeLessThanOrEqual(7 * n + 1);
    }
  });
});
