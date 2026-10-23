import { describe, expect, it } from 'vitest';
import { bubbleSort } from '../../../src/algorithms/sort/bubble';
import { insertionSort } from '../../../src/algorithms/sort/insertion';
import { makeSortInput } from '../../../src/algorithms/sort/input';
import type { SortInput } from '../../../src/algorithms/sort/input';
import { mergeSort } from '../../../src/algorithms/sort/merge';
import { quickNaive, quickRandom } from '../../../src/algorithms/sort/quick';
import { replayArray } from '../../../src/algorithms/sort/replay';
import { binarySearchRecursive } from '../../../src/algorithms/search/binaryRecursive';
import { makeSearchInput } from '../../../src/algorithms/search/input';
import { buildCallTree, levelSums } from '../../../src/engine/calltree';
import { mulberry32 } from '../../../src/engine/rng';
import { runCount, runTrace } from '../../../src/engine/runner';
import type { Algorithm } from '../../../src/engine/runner';

const SORTS: [string, Algorithm<SortInput, number[]>][] = [
  ['bubble', bubbleSort],
  ['insertion', insertionSort],
  ['merge', mergeSort],
  ['quickNaive', quickNaive],
  ['quickRandom', quickRandom],
];

const sorted = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const input = (arr: number[], seed = 7): SortInput => ({ arr, seed });
const compares = (algo: Algorithm<SortInput, number[]>, arr: number[], seed = 7) =>
  runCount(algo, input(arr, seed)).counters;

describe.each(SORTS)('%s sort', (_name, algo) => {
  it('sorts edge cases, duplicates and random arrays without mutating the input', () => {
    const rng = mulberry32(3);
    const cases = [[], [1], [2, 1], [3, 3, 3], [5, 1, 4, 1, 5, 9, 2, 6]];
    for (let k = 0; k < 30; k++) cases.push(Array.from({ length: 1 + (k % 20) }, () => Math.floor(rng() * 10)));
    for (const arr of cases) {
      const copy = [...arr];
      expect(runCount(algo, input(arr)).result).toEqual([...arr].sort((x, y) => x - y));
      expect(arr).toEqual(copy);
    }
  });

  it('replaying the trace reproduces the sorted array', () => {
    for (const kind of ['random', 'sorted', 'reversed', 'fewUnique'] as const) {
      const inp = makeSortInput(20, kind, mulberry32(5));
      const trace = runTrace(algo, inp);
      expect(replayArray(inp.arr, trace.steps, trace.steps.length)).toEqual(trace.result);
    }
  });
});

describe('sort op counts', () => {
  const ns = [1, 2, 5, 16, 33, 64];

  it('insertion sort: reversed is n(n-1)/2 compares and swaps, sorted is n-1 compares and no swaps', () => {
    for (const n of ns) {
      const rev = compares(insertionSort, sorted(n).reverse());
      expect(rev.ops.compare).toBe((n * (n - 1)) / 2);
      expect(rev.ops.swap).toBe((n * (n - 1)) / 2);
      const asc = compares(insertionSort, sorted(n));
      expect(asc.ops.compare).toBe(Math.max(0, n - 1));
      expect(asc.ops.swap).toBe(0);
      expect(asc.peakMem).toBeLessThanOrEqual(2);
    }
  });

  it('bubble sort: sorted is one pass; reversed, or just the smallest value last, is n(n-1)/2 compares', () => {
    for (const n of ns) {
      const asc = compares(bubbleSort, sorted(n));
      expect(asc.ops.compare).toBe(Math.max(0, n - 1));
      expect(asc.ops.swap).toBe(0);
      const rev = compares(bubbleSort, sorted(n).reverse());
      expect(rev.ops.compare).toBe((n * (n - 1)) / 2);
      expect(rev.ops.swap).toBe((n * (n - 1)) / 2);
      // [2, 3, …, n, 1]: the 1 moves one place per pass, so every pass is needed, but only n−1 swaps.
      const turtle = compares(bubbleSort, [...sorted(n).slice(1), 1].slice(0, n));
      expect(turtle.ops.compare).toBe((n * (n - 1)) / 2);
      expect(turtle.ops.swap).toBe(Math.max(0, n - 1));
      // [n, 1, 2, …]: the n bubbles to the end in one pass, then a clean pass: about 2n.
      const hare = compares(bubbleSort, [n, ...sorted(n - 1)].slice(0, n));
      expect(hare.ops.compare).toBe(n <= 1 ? 0 : n === 2 ? 1 : 2 * n - 3);
      expect(hare.peakMem).toBe(3);
    }
  });

  it('merge sort: sorted 2^k input takes exactly (n/2)·k compares; random stays within the textbook bounds', () => {
    for (let k = 1; k <= 10; k++) {
      const n = 2 ** k;
      expect(compares(mergeSort, sorted(n)).ops.compare).toBe((n / 2) * k);
      const rnd = makeSortInput(n, 'random', mulberry32(k));
      const c = runCount(mergeSort, rnd).counters;
      expect(c.ops.compare).toBeGreaterThanOrEqual((n / 2) * k);
      expect(c.ops.compare).toBeLessThanOrEqual(n * k - n + 1);
      expect(c.peakStack).toBe(k + 1);
      expect(c.peakMem).toBeLessThanOrEqual(n);
    }
  });

  it('naive quicksort on sorted input does exactly n(n-1)/2 compares with stack depth n-1', () => {
    for (const n of [2, 5, 16, 64, 200]) {
      const c = compares(quickNaive, sorted(n));
      expect(c.ops.compare).toBe((n * (n - 1)) / 2);
      expect(c.peakStack).toBe(n - 1);
    }
  });

  it('random-pivot quicksort stays near n log n on sorted input', () => {
    for (const n of [64, 256, 1024]) {
      expect(compares(quickRandom, sorted(n), 11).ops.compare).toBeLessThan(2 * n * Math.log2(n));
    }
  });
});

describe('recursion trees', () => {
  it('merge sort on 16 sorted elements: 5 levels of 8, 8, 8, 8, 0 compares', () => {
    const { steps, counters } = runTrace(mergeSort, input(sorted(16)));
    const sums = levelSums(buildCallTree(steps, 'compare'));
    expect(sums).toEqual([8, 8, 8, 8, 0]);
    expect(sums.reduce((a, b) => a + b)).toBe(counters.ops.compare);
  });

  it('merge sort level costs never exceed n', () => {
    const inp = makeSortInput(48, 'random', mulberry32(2));
    const sums = levelSums(buildCallTree(runTrace(mergeSort, inp).steps, 'compare'));
    expect(sums.every((s) => s <= 48)).toBe(true);
  });

  it('recursive binary search is a path of depth floor(log2 n) + 1', () => {
    for (const n of [1, 7, 16, 100]) {
      const inp = makeSearchInput(n, 'worst', mulberry32(1));
      const { steps, result } = runTrace(binarySearchRecursive, inp);
      expect(result).toBe(-1);
      const nodes = buildCallTree(steps, 'compare');
      expect(nodes.filter((x) => x.ownOps > 0)).toHaveLength(Math.floor(Math.log2(n)) + 1);
      expect(new Set(nodes.map((x) => x.depth)).size).toBe(nodes.length);
    }
  });
});
