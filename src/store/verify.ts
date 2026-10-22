import { create } from 'zustand';
import { blank, BOX_SHAPES, solvedBoard } from '../algorithms/sudoku/board';
import type { Board } from '../algorithms/sudoku/board';
import type { SubsetSumInput } from '../algorithms/subset-sum/input';
import { runBenchmarks } from '../engine/benchmark';
import type { BenchmarkPoint } from '../engine/benchmark-core';
import { mulberry32, randInt } from '../engine/rng';
import { benchSizes, findAlgorithm } from '../modules/registry';
import { enumParam, intParam } from './url-state';

export const TABS = ['sudoku', 'subset'] as const;
export type Tab = (typeof TABS)[number];
export const SIZES = ['4', '6', '9'] as const;
export type Size = (typeof SIZES)[number];
/** Blanks per board side: about half the cells. */
const BLANKS: Record<Size, number> = { '4': 8, '6': 18, '9': 45 };
export const VERIFY_ALGOS = ['sudoku-check', 'sudoku-solve', 'subset-check', 'subset-solve'] as const;
export type VerifyAlgo = (typeof VERIFY_ALGOS)[number];
export const verifyAlgoId = (a: VerifyAlgo) => `verify/${a}`;
export const MIN_SUBSET_N = 4;
export const MAX_SUBSET_N = 20;

export interface Puzzle {
  solution: Board;
  puzzle: Board;
}

export function makePuzzle(size: Size, seed: number): Puzzle {
  const [r, c] = BOX_SHAPES[Number(size)]!;
  const solution = solvedBoard(r, c, mulberry32(seed));
  return { solution, puzzle: blank(solution, BLANKS[size], mulberry32(seed + 1)) };
}

/** n numbers 1..60 and the sum of a random subset of them, so a solution exists. */
export function makeSubsetInstance(n: number, seed: number): SubsetSumInput {
  const rng = mulberry32(seed);
  const nums = Array.from({ length: n }, () => randInt(rng, 1, 61));
  const target = nums.reduce((s, x) => (rng() < 0.4 ? s + x : s), 0) || nums[0]!;
  return { nums, target };
}

/** Student entries: one digit per cell, row-major, 0 for blank. */
function parseEntries(raw: string | null, cells: number): number[] | undefined {
  if (!raw) return undefined;
  const v = raw.split('.').map(Number);
  return v.length === cells && v.every((x) => Number.isInteger(x) && x >= 0 && x <= 9) ? v : undefined;
}

interface VerifyState {
  tab: Tab;
  size: Size;
  seed: number;
  /** The board as the student has filled it (givens included). */
  entries: number[];
  step: number;
  subsetN: number;
  subsetSeed: number;
  chosen: number[];
  bench: Partial<Record<VerifyAlgo, BenchmarkPoint[]>>;
  benchRunning: boolean;
  setTab: (t: Tab) => void;
  newPuzzle: (size: Size, seed: number) => void;
  setCell: (i: number, v: number) => void;
  fill: (cells: number[]) => void;
  setStep: (s: number) => void;
  newSubset: (n: number, seed: number) => void;
  toggle: (i: number) => void;
  setChosen: (indices: number[]) => void;
  runBench: (algos: VerifyAlgo[]) => void;
}

export const useVerifyStore = create<VerifyState>()((set) => {
  let cancel = () => {};
  const size = enumParam('size', SIZES, '4');
  const seed = intParam('seed', 1, 0, 1e9);
  const puzzle = makePuzzle(size, seed).puzzle;
  const chosen = new URLSearchParams(location.search).get('pick');
  return {
    tab: enumParam('tab', TABS, 'sudoku'),
    size,
    seed,
    entries: parseEntries(new URLSearchParams(location.search).get('e'), puzzle.cells.length) ?? puzzle.cells,
    step: intParam('step', 0, 0, 1e6),
    subsetN: intParam('sn', 10, MIN_SUBSET_N, MAX_SUBSET_N),
    subsetSeed: intParam('sseed', 1, 0, 1e9),
    chosen: chosen ? chosen.split('.').map(Number).filter((i) => Number.isInteger(i) && i >= 0 && i < MAX_SUBSET_N) : [],
    bench: {},
    benchRunning: false,

    setTab: (tab) => set({ tab, step: 0 }),
    newPuzzle: (size, seed) => set({ size, seed, entries: makePuzzle(size, seed).puzzle.cells, step: 0 }),
    setCell: (i, v) => set((s) => ({ entries: s.entries.map((x, k) => (k === i ? v : x)), step: 0 })),
    fill: (entries) => set({ entries, step: 0 }),
    setStep: (step) => set({ step: Math.max(0, step) }),
    newSubset: (subsetN, subsetSeed) => set({ subsetN, subsetSeed, chosen: [] }),
    toggle: (i) =>
      set((s) => ({ chosen: s.chosen.includes(i) ? s.chosen.filter((x) => x !== i) : [...s.chosen, i] })),
    setChosen: (chosen) => set({ chosen }),
    runBench: (algos) => {
      cancel();
      set((s) => ({ benchRunning: true, bench: { ...s.bench, ...Object.fromEntries(algos.map((a) => [a, []])) } }));
      const byId = Object.fromEntries(algos.map((a) => [verifyAlgoId(a), a])) as Record<string, VerifyAlgo>;
      cancel = runBenchmarks(
        algos.map((a) => {
          const spec = findAlgorithm(verifyAlgoId(a));
          const kind = spec.inputKinds[0]!.id;
          return { algoId: spec.id, nValues: benchSizes(spec, kind), inputKind: kind, seed: 1 };
        }),
        (p) => {
          const a = byId[p.algoId]!;
          set((s) => ({ bench: { ...s.bench, [a]: [...(s.bench[a] ?? []), p] } }));
        },
        () => set({ benchRunning: false }),
      );
    },
  };
});
