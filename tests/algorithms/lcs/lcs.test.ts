import { describe, expect, it } from 'vitest';
import { lcsHirschberg } from '../../../src/algorithms/lcs/hirschberg';
import { isSubsequence, LCS_KINDS, lcsLength, makeLcsInput } from '../../../src/algorithms/lcs/input';
import { lcsRows } from '../../../src/algorithms/lcs/rows';
import { lcsTable } from '../../../src/algorithms/lcs/table';
import { mulberry32, randInt } from '../../../src/engine/rng';
import { runCount } from '../../../src/engine/runner';

const run = (algo: typeof lcsTable, a: string, b: string) => runCount(algo, { a, b });

describe('longest common subsequence', () => {
  it('all three agree with the reference, and the recovered subsequences are common and longest', () => {
    const rng = mulberry32(6);
    const pairs: [string, string][] = [['', ''], ['A', ''], ['', 'A'], ['A', 'A'], ['A', 'C'], ['ABCBDAB', 'BDCABA'], ['AGGTAB', 'GXTXAYB']];
    for (let k = 0; k < 300; k++) {
      const kind = LCS_KINDS[k % 3]!.id;
      const { a } = makeLcsInput(randInt(rng, 0, 15), kind, rng);
      const { b } = makeLcsInput(randInt(rng, 0, 15), kind, rng);
      pairs.push([a, b]);
    }
    for (const [a, b] of pairs) {
      const want = lcsLength(a, b);
      expect(run(lcsRows, a, b).result).toEqual({ length: want });
      for (const algo of [lcsTable, lcsHirschberg]) {
        const r = run(algo, a, b).result!;
        expect(r.length).toBe(want);
        expect(r.lcs).toHaveLength(want);
        expect(isSubsequence(r.lcs!, a) && isSubsequence(r.lcs!, b)).toBe(true);
      }
    }
    expect(run(lcsTable, 'ABCBDAB', 'BDCABA').result!.length).toBe(4);
  });

  it('the table and two rows compare every pair of letters once; Hirschberg about twice', () => {
    for (const n of [1, 8, 33, 100]) {
      const { a, b } = makeLcsInput(n, 'random', mulberry32(n));
      // Plus n compares to walk back through the table.
      expect(run(lcsTable, a, b).counters.ops.compare).toBeLessThanOrEqual(n * n + 2 * n);
      expect(run(lcsTable, a, b).counters.ops.compare).toBeGreaterThanOrEqual(n * n);
      expect(run(lcsRows, a, b).counters.ops.compare).toBe(n * n);
      // Letter compares: nm at the top, half that one level down, and so on: under 2nm.
      // Each split also scans its m + 1 split points (about m per level), and base cases add up to m.
      const h = run(lcsHirschberg, a, b).counters.ops.compare;
      expect(h).toBeGreaterThanOrEqual(n * n);
      expect(h).toBeLessThanOrEqual(2 * n * n + n * (Math.ceil(Math.log2(n)) + 3));
    }
  });

  it('memory: the table needs every cell, the rows and Hirschberg only O(n), Hirschberg log n frames deep', () => {
    const n = 256;
    const { a, b } = makeLcsInput(n, 'similar', mulberry32(2));
    expect(run(lcsTable, a, b).counters.peakMem).toBe((n + 1) * (n + 1));
    expect(run(lcsRows, a, b).counters.peakMem).toBe(2 * (n + 1));
    const h = run(lcsHirschberg, a, b).counters;
    expect(h.peakMem).toBeLessThanOrEqual(2 * (n + 1));
    expect(h.peakStack).toBeLessThanOrEqual(Math.ceil(Math.log2(n)) + 1);
  });

  it('strings with no letters in common have an empty LCS', () => {
    const { a, b } = makeLcsInput(20, 'different', mulberry32(1));
    expect(run(lcsHirschberg, a, b).result).toEqual({ length: 0, lcs: '' });
  });
});
