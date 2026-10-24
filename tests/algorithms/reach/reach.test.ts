import { describe, expect, it } from 'vitest';
import { reachBfs } from '../../../src/algorithms/reach/bfs';
import { makeReachInput, REACH_KINDS, reachable, savitchK } from '../../../src/algorithms/reach/input';
import type { ReachInput } from '../../../src/algorithms/reach/input';
import { reachSavitch } from '../../../src/algorithms/reach/savitch';
import { mulberry32, randInt } from '../../../src/engine/rng';
import { runCount } from '../../../src/engine/runner';

describe('reachability', () => {
  it('BFS and Savitch agree with the reference on random graphs and every kind', () => {
    const rng = mulberry32(4);
    const inputs: ReachInput[] = [];
    for (let k = 0; k < 300; k++) {
      const n = randInt(rng, 1, 10);
      const g = makeReachInput(n, 'random', rng).g;
      inputs.push({ g, s: randInt(rng, 0, n), t: randInt(rng, 0, n) });
    }
    for (const kind of REACH_KINDS) for (const n of [1, 2, 5, 9]) inputs.push(makeReachInput(n, kind.id, rng));
    let yes = 0;
    for (const input of inputs) {
      const want = reachable(input);
      if (want) yes++;
      expect(runCount(reachBfs, input).result).toBe(want);
      expect(runCount(reachSavitch, input).result).toBe(want);
    }
    expect(yes).toBeGreaterThan(50);
    expect(yes).toBeLessThan(inputs.length - 20);
  });

  it('the kinds: the path reaches t, the cut-off path does not', () => {
    for (const n of [2, 7, 16]) {
      expect(reachable(makeReachInput(n, 'path', mulberry32(1)))).toBe(true);
      expect(reachable(makeReachInput(n, 'unreachable', mulberry32(1)))).toBe(false);
    }
  });

  it('memory: BFS keeps 2n cells; Savitch keeps no cells and ⌈log₂ n⌉ + 1 frames', () => {
    for (const n of [2, 3, 8, 16]) {
      const input = makeReachInput(n, 'unreachable', mulberry32(1));
      const bfs = runCount(reachBfs, input).counters;
      expect([bfs.peakMem, bfs.peakStack]).toEqual([2 * n, 0]);
      const sav = runCount(reachSavitch, input).counters;
      expect([sav.peakMem, sav.peakStack]).toEqual([0, savitchK(n) + 1]);
    }
  });

  it('Savitch’s calls: each comes from line 4 or 5, and there are at most (2n)⁰ + … + (2n)ᵏ', () => {
    for (const n of [2, 4, 8]) {
      for (const kind of REACH_KINDS) {
        const c = runCount(reachSavitch, makeReachInput(n, kind.id, mulberry32(2))).counters;
        const k = savitchK(n);
        expect(c.lines[1]).toBe(c.ops.pushFrame);
        expect((c.lines[4] ?? 0) + (c.lines[5] ?? 0) + 1).toBe(c.lines[1]);
        expect(c.lines[3]).toBe(c.lines[4]);
        expect(c.lines[1]).toBeLessThanOrEqual(Array.from({ length: k + 1 }, (_, j) => (2 * n) ** j).reduce((a, b) => a + b));
      }
    }
  });
});
