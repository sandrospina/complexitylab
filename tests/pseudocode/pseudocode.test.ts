import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { binarySearch } from '../../src/algorithms/search/binary';
import { binarySearchRecursive } from '../../src/algorithms/search/binaryRecursive';
import { makeSearchInput } from '../../src/algorithms/search/input';
import { interpolationSearch } from '../../src/algorithms/search/interpolation';
import { jumpSearch } from '../../src/algorithms/search/jump';
import { linearSearch } from '../../src/algorithms/search/linear';
import { bubbleSort } from '../../src/algorithms/sort/bubble';
import { makeSortInput } from '../../src/algorithms/sort/input';
import { insertionSort } from '../../src/algorithms/sort/insertion';
import { mergeSort } from '../../src/algorithms/sort/merge';
import { quickNaive } from '../../src/algorithms/sort/quick';
import { timSort } from '../../src/algorithms/sort/tim';
import { cycleFloyd } from '../../src/algorithms/cycle/floyd';
import { cycleHash } from '../../src/algorithms/cycle/hash';
import { makeRho } from '../../src/algorithms/cycle/input';
import { fibIterative } from '../../src/algorithms/fib/iterative';
import { fibMemo, fibNaive } from '../../src/algorithms/fib/recursive';
import { lcsHirschberg } from '../../src/algorithms/lcs/hirschberg';
import { makeLcsInput } from '../../src/algorithms/lcs/input';
import { lcsRows } from '../../src/algorithms/lcs/rows';
import { lcsTable } from '../../src/algorithms/lcs/table';
import { bfs } from '../../src/algorithms/graph/bfs';
import { dfs } from '../../src/algorithms/graph/dfs';
import { dijkstraArray } from '../../src/algorithms/graph/dijkstra-array';
import { dijkstraHeap } from '../../src/algorithms/graph/dijkstra-heap';
import { edgesOf } from '../../src/algorithms/graph/graph';
import { makeDijkstraInput } from '../../src/algorithms/graph/input';
import { makePreset } from '../../src/algorithms/graph/presets';
import { knapsackBrute } from '../../src/algorithms/knapsack/brute';
import { knapsackDp } from '../../src/algorithms/knapsack/dp';
import { scaledInstance } from '../../src/algorithms/knapsack/input';
import { tspBrute } from '../../src/algorithms/tsp/brute';
import { tspHeldKarp } from '../../src/algorithms/tsp/held-karp';
import { tspHeuristic } from '../../src/algorithms/tsp/heuristic';
import { makeTspInput } from '../../src/algorithms/tsp/input';
import { BOX_SHAPES, solvedBoard } from '../../src/algorithms/sudoku/board';
import { checkSudoku } from '../../src/algorithms/sudoku/check';
import { subsetSumBrute } from '../../src/algorithms/subset-sum/brute';
import { makeSolveInput as makeSubsetInput, makeVerifyInput } from '../../src/algorithms/subset-sum/input';
import { verifySubsetSum } from '../../src/algorithms/subset-sum/verify';
import { makePreset as makeSatPreset, pigeonhole } from '../../src/algorithms/sat/cnf';
import { dpll } from '../../src/algorithms/sat/dpll';
import { truthTable } from '../../src/algorithms/sat/truth-table';
import { mulberry32 } from '../../src/engine/rng';
import { runCount } from '../../src/engine/runner';
import type { Algorithm } from '../../src/engine/runner';
import { PSEUDOCODE } from '../../src/pseudocode';
import { MODULES } from '../../src/modules/registry';

const PILOT = ['search', 'sorting', 'time-space', 'graphs', 'knapsack', 'tsp', 'verify', 'sat'];
const lines = <I,>(algo: Algorithm<I, unknown>, input: I) => runCount(algo, input).counters.lines;
const sorted = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const sortIn = (arr: number[]) => ({ arr, seed: 1 });
const lg = (n: number) => Math.floor(Math.log2(n));

describe('pseudocode entries', () => {
  const ids = MODULES.filter((m) => PILOT.includes(m.id)).flatMap((m) => m.algorithms.map((a) => a.id));

  it('every algorithm in the pilot modules has pseudocode', () => {
    for (const id of ids) expect(PSEUDOCODE[id], id).toBeDefined();
  });

  it('sources exist, every tag names a real line, and every line with a times formula is tagged', () => {
    for (const [id, p] of Object.entries(PSEUDOCODE)) {
      const tagged = new Set<number>();
      for (const file of p.sources) {
        const src = readFileSync(`src/algorithms/${file}`, 'utf8');
        // `line: 4`, `line: left ? 11 : 12`, `ins.at(i < m ? 10 : 9)`: every literal in the tag expression.
        // …and `const line = backwards ? 5 : 4`, for events that use the shorthand `{ line }`.
        for (const m of src.matchAll(/line: ([^,}\n]+)|ins\.at\(([^)]+)\)|const line = ([^;\n]+)/g))
          for (const d of (m[1] ?? m[2] ?? m[3]!).matchAll(/\b\d+\b/g)) tagged.add(Number(d[0]));
        // TimSort's helpers take the line as an argument.
        for (const m of src.matchAll(/(?:less\([^,]+, [^,]+, |put\([^,]+, [^,]+, )(\d+)|(?:true|false), (\d+)\)|yield\* push\([^;]*, (\d+)\);/g))
          tagged.add(Number(m[1] ?? m[2] ?? m[3]));
      }
      for (const k of tagged) expect(k >= 1 && k <= p.lines.length, `${id}: line ${k}`).toBe(true);
      p.lines.forEach((l, i) => {
        if (l.times !== undefined) expect(tagged.has(i + 1), `${id}: line ${i + 1} has a formula but is never measured`).toBe(true);
      });
      for (const d of p.dominant) expect(tagged.has(d), `${id}: dominant line ${d}`).toBe(true);
    }
  });
});

describe('measured line counts match the formulas', () => {
  it('linear search, x absent: the loop test n + 1 times, the comparison n', () => {
    for (const n of [1, 7, 100]) {
      const c = lines(linearSearch, makeSearchInput(n, 'worst', mulberry32(1)));
      expect([c[1], c[2], c[3] ?? 0, c[4]]).toEqual([n + 1, n, 0, 1]);
    }
  });

  it('binary search, x absent: ⌊log₂ n⌋ + 1 iterations, ⌊log₂ n⌋ + 2 loop tests', () => {
    for (const n of [1, 2, 3, 16, 1000, 1024]) {
      const c = lines(binarySearch, makeSearchInput(n, 'worst', mulberry32(1)));
      expect([c[2], c[3], c[4], c[7]]).toEqual([lg(n) + 2, lg(n) + 1, lg(n) + 1, 1]);
      const r = lines(binarySearchRecursive, makeSearchInput(n, 'worst', mulberry32(1)));
      expect([r[1], r[3]]).toEqual([lg(n) + 2, lg(n) + 1]);
    }
  });

  it('jump search, x absent: ⌈n/m⌉ − 1 jumps, then the last block', () => {
    for (const n of [16, 100, 1000]) {
      const m = Math.floor(Math.sqrt(n));
      const c = lines(jumpSearch, makeSearchInput(n, 'worst', mulberry32(1)));
      const jumps = Math.ceil(n / m) - 1;
      expect([c[2], c[3], c[4]]).toEqual([jumps + 1, jumps, jumps]);
      expect(c[6]).toBe(n - m * jumps);
    }
  });

  it('interpolation search on the skewed array: n − 1 probes', () => {
    for (const n of [4, 50, 1000]) {
      const c = lines(interpolationSearch, makeSearchInput(n, 'skewed', mulberry32(1)));
      expect([c[2], c[3], c[4], c[5], c[6], c[7] ?? 0]).toEqual([n - 1, n - 1, n - 1, n - 1, n - 2, 0]);
    }
  });

  it('insertion sort: reversed n = 10 gives the CLRS worst-case column, sorted the best case', () => {
    const n = 10;
    const w = lines(insertionSort, sortIn(sorted(n).reverse()));
    expect([w[1], w[2], w[3], w[4], w[5], w[6]]).toEqual([n, n - 1, (n * (n + 1)) / 2 - 1, (n * (n - 1)) / 2, (n * (n - 1)) / 2, (n * (n - 1)) / 2]);
    const b = lines(insertionSort, sortIn(sorted(n)));
    expect([b[4], b[5] ?? 0]).toEqual([n - 1, 0]);
  });

  it('bubble sort: reversed is n(n − 1)/2 compares over n − 1 sweeps; sorted is one sweep', () => {
    const n = 12;
    const w = lines(bubbleSort, sortIn(sorted(n).reverse()));
    expect([w[2], w[3], w[4], w[5], w[6], w[7]]).toEqual([n, n - 1, (n * (n + 1)) / 2 - 1, (n * (n - 1)) / 2, (n * (n - 1)) / 2, n - 1]);
    const b = lines(bubbleSort, sortIn(sorted(n)));
    expect([b[2], b[5], b[6] ?? 0]).toEqual([2, n - 1, 0]);
  });

  it('merge sort on 2^k: 2n − 1 calls, n − 1 merges, n log₂ n elements merged', () => {
    for (const k of [1, 3, 6]) {
      const n = 2 ** k;
      for (const arr of [sorted(n), sorted(n).reverse()]) {
        const c = lines(mergeSort, sortIn(arr));
        expect([c[1], c[2], c[5], c[6], c[7]]).toEqual([2 * n - 1, n - 1, n - 1, n - 1, n - 1]);
        expect(c[8]).toBe(n * k + n - 1);
        expect((c[9] ?? 0) + (c[10] ?? 0) + (c[11] ?? 0) + (c[12] ?? 0)).toBe(n * k);
      }
      // Sorted input: every comparison takes from the left half, (n/2)·k of them.
      expect(lines(mergeSort, sortIn(sorted(n)))[11]).toBe((n / 2) * k);
    }
  });

  it('quicksort (last pivot) on sorted input: the partition comparison runs n(n − 1)/2 times', () => {
    for (const n of [5, 20]) {
      const c = lines(quickNaive, sortIn(sorted(n)));
      expect(c[9]).toBe((n * (n - 1)) / 2);
      // Every element is smaller than the pivot, so lines 10–11 run each time line 9 does.
      expect([c[10], c[11]]).toEqual([c[9], c[9]]);
      expect(c[3]).toBe(n - 1);
    }
  });

  it('TimSort on sorted input: one run of n − 1 compares, no merges', () => {
    for (const n of [100, 5000]) {
      const c = lines(timSort, sortIn(sorted(n)));
      expect(c[3]).toBe(n - 1);
      expect([c[5] ?? 0, c[9] ?? 0, c[10] ?? 0, c[11] ?? 0, c[8] ?? 0]).toEqual([0, 0, 0, 0, 0]);
    }
    // Random input exercises every phase.
    const rnd = lines(timSort, makeSortInput(2000, 'random', mulberry32(3)));
    for (const k of [3, 5, 9, 10]) expect(rnd[k] ?? 0, `line ${k}`).toBeGreaterThan(0);
  });

  it('tagging changes no op counts', () => {
    const c = runCount(insertionSort, sortIn(sorted(10).reverse())).counters;
    expect([c.ops.compare, c.ops.swap, c.totalOps]).toEqual([45, 45, 90]);
  });

  it('Fibonacci: naive makes 2F(n+1) − 1 calls; memoised 2n − 1; iterative n − 1 steps', () => {
    const F = (k: number) => {
      let [a, b] = [0, 1];
      for (let i = 0; i < k; i++) [a, b] = [b, a + b];
      return a;
    };
    for (const n of [2, 5, 10, 15]) {
      const naive = lines(fibNaive, { n });
      expect([naive[1] ?? 0, naive[2], naive[3] ?? 0, naive[4], naive[5], naive[6] ?? 0, naive[7]]).toEqual([0, 2 * F(n + 1) - 1, 0, F(n + 1) - 1, F(n + 1) - 1, 0, F(n + 1) - 1]);
      const memo = lines(fibMemo, { n });
      // k = 2..n each computed once; the right-hand calls fib(k − 2) for k ≥ 4 are memo hits.
      expect([memo[1], memo[2], memo[3], memo[4], memo[6], memo[7]]).toEqual([1, 2 * n - 1, n - 1 + Math.max(0, n - 3), n - 1, n - 1, n - 1]);
      const it = lines(fibIterative, { n });
      expect([it[1], it[2], it[3], it[4]]).toEqual([1, n, n - 1, 1]);
    }
  });

  it('cycle detection: the hash set visits n + 1 values; Floyd walks k, μ and λ rounds', () => {
    for (const [mu, lambda] of [[0, 1], [5, 5], [9, 1], [3, 7]] as const) {
      const input = makeRho(mu, lambda, mulberry32(2));
      const n = mu + lambda;
      const h = lines(cycleHash, input);
      expect([h[1], h[2], h[3], h[4], h[5]]).toEqual([1, n + 1, n, n, 1]);
      let k = Math.max(1, mu);
      while (k % lambda !== 0) k++;
      const f = lines(cycleFloyd, input);
      expect([f[2], f[4], f[5] ?? 0, f[7]]).toEqual([k, mu + 1, mu, lambda]);
    }
  });

  it('LCS: the table and two rows compare nm pairs; Hirschberg at most 2nm', () => {
    for (const n of [1, 6, 20]) {
      const { a, b } = makeLcsInput(n, 'similar', mulberry32(n));
      for (const algo of [lcsTable, lcsRows]) {
        const c = lines(algo, { a, b });
        expect([c[2], c[3], c[4], (c[5] ?? 0) + (c[6] ?? 0)]).toEqual([n + 1, n * (n + 1), n * n, n * n]);
      }
      expect(lines(lcsTable, { a, b })[7]).toBeLessThanOrEqual(2 * n);
      expect(lines(lcsRows, { a, b })[7]).toBe(n);
      const h = lines(lcsHirschberg, { a, b });
      expect((h[4] ?? 0) + (h[5] ?? 0)).toBeLessThanOrEqual(2 * n * n);
    }
  });

  it('BFS and DFS: every vertex once, every edge from both ends', () => {
    for (const id of ['tree', 'path', 'grid', 'random'] as const) {
      const g = makePreset(id);
      const V = g.n;
      const E = edgesOf(g).length;
      const reachable = (runCount(bfs, { g, source: 0 }).result as number[]).filter((d) => d >= 0).length;
      if (reachable !== V) continue;
      const b = lines(bfs, { g, source: 0 });
      expect([b[1], b[2], b[3], b[4], b[5], b[6], b[7]]).toEqual([1, 1, V + 1, V, 2 * E, 2 * E, V - 1]);
      const d = lines(dfs, { g, source: 0 });
      expect([d[1], d[2], d[3], d[4], d[5], d[6]]).toEqual([1, 1, V, 2 * E, 2 * E, V - 1]);
    }
  });

  it('Dijkstra: the array scans V² entries; the heap relaxes 2E edge ends with a heap operation per improvement', () => {
    const input = makeDijkstraInput(30, 'degree', mulberry32(4), 4);
    const V = input.g.n;
    const E = edgesOf(input.g).length;
    const a = lines(dijkstraArray, input);
    expect([a[2], a[3], a[4], a[5], a[6], a[7]]).toEqual([V, V * V, V, V, 2 * E, 2 * E]);
    const h = lines(dijkstraHeap, input);
    expect([h[5], h[6]]).toEqual([2 * E, 2 * E]);
    // These weights make every edge improve a distance once: one insert per edge, plus the source.
    expect(h[7]).toBe(E);
    expect(h[2]).toBe(E + 2);
  });

  it('knapsack: brute force tries 2ⁿ − 1 subsets; the DP fills n(W + 1) cells', () => {
    for (const [n, bits] of [[1, 3], [4, 5], [8, 6]] as const) {
      const input = scaledInstance(n, bits, 2);
      const W = input.W;
      const b = lines(knapsackBrute, input);
      expect([b[2], b[3], b[4], b[5]]).toEqual([2 ** n, 2 ** n - 1, 2 ** n - 1, 2 ** n - 1]);
      const d = lines(knapsackDp, input);
      expect([d[2], d[3], d[4], d[5], d[6], d[7]]).toEqual([n + 1, n * (W + 2), n * (W + 1), n * (W + 1), n * (W + 1), n]);
    }
  });

  it('TSP: brute force costs n! edge lengths; Held–Karp extends (n − 1)(n − 2)2ⁿ⁻³ paths; nearest neighbour n(n − 1)/2', () => {
    const fact = (k: number): number => (k <= 1 ? 1 : k * fact(k - 1));
    for (const n of [3, 5, 7]) {
      const input = makeTspInput(n, 'random', mulberry32(n));
      const b = lines(tspBrute, input);
      expect([b[2], b[3], b[4]]).toEqual([fact(n - 1), fact(n), fact(n - 1)]);
      const h = lines(tspHeldKarp, input);
      expect([h[1], h[2], h[3], h[4], h[5]]).toEqual([n - 1, 2 ** (n - 1) - 1, (n - 1) * 2 ** (n - 2), (n - 1) * (n - 2) * 2 ** (n - 3), n - 1]);
    }
    for (const n of [6, 30]) {
      const c = lines(tspHeuristic, makeTspInput(n, 'random', mulberry32(n)));
      expect([c[2], c[3]]).toEqual([n, (n * (n - 1)) / 2]);
      expect(c[5]).toBe(c[4]! * ((n * (n - 3)) / 2));
      expect(c[7]).toBe(c[4]);
    }
  });

  it('verify vs solve: the checkers are linear in their input, the searches exponential', () => {
    for (const sz of [4, 9, 16]) {
      const [r, c] = BOX_SHAPES[sz]!;
      const k = lines(checkSudoku, solvedBoard(r, c, mulberry32(sz)));
      expect([k[2], k[3], k[4], k[5], k[6]]).toEqual([3 * sz, 3 * sz * sz, 3 * sz * sz, 3 * sz * sz, 1]);
    }
    for (const n of [4, 10]) {
      const cert = makeVerifyInput(n, 'valid', mulberry32(n));
      const v = lines(verifySubsetSum, cert);
      const C = cert.cert.length;
      expect([v[2], v[3], v[4], v[5]]).toEqual([C + 1, C, C, 1]);
      const s = lines(subsetSumBrute, makeSubsetInput(n, 'none', mulberry32(n)));
      expect([s[2], s[3], s[4], s[5], s[6]]).toEqual([2 ** n, 2 ** n - 1, 2 ** n - 1, 2 ** n - 1, 1]);
    }
  });

  it('SAT: the truth table tries all 2ⁿ rows of an unsatisfiable formula; DPLL’s lines count its search', () => {
    const opts = { heuristic: 'first' as const, propagate: true, pure: false };
    const core = makeSatPreset('core', mulberry32(1));
    const tt = runCount(truthTable, { cnf: core, ...opts }).counters;
    expect([tt.lines[1], tt.lines[2], tt.lines[3] ?? 0, tt.lines[4]]).toEqual([8, tt.ops.clauseCheck, 0, 1]);
    // PHP(3, 2): x1 = 1 forces five assignments and a conflict; its flip forces five more and another.
    const php = runCount(dpll, { cnf: pigeonhole(3), ...opts }).counters;
    expect([php.lines[3], php.lines[5], php.lines[7], php.lines[9], php.lines[6] ?? 0]).toEqual([2, 1, 1, 10, 0]);
    expect((php.lines[5] ?? 0) + (php.lines[7] ?? 0)).toBe(php.ops.decide);
    expect(php.lines[8]).toBe(php.ops.clauseCheck);
    const ex = runCount(dpll, { cnf: makeSatPreset('example', mulberry32(1)), ...opts }).counters;
    expect([ex.lines[6], ex.lines[3], (ex.lines[5] ?? 0) + (ex.lines[7] ?? 0)]).toEqual([1, 1, 4]);
  });
});
