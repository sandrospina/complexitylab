import { create } from 'zustand';
import { GEO_KINDS } from '../algorithms/geography/input';
import type { GeoKind } from '../algorithms/geography/input';
import { QBF_KINDS } from '../algorithms/qbf/input';
import type { QbfKind } from '../algorithms/qbf/input';
import { runBenchmarks } from '../engine/benchmark';
import type { BenchmarkPoint } from '../engine/benchmark-core';
import type { ComplexityClass } from '../engine/complexity';
import { benchSizes, findAlgorithm } from '../modules/registry';
import { enumParam, intParam } from './url-state';
import { Y_METRICS } from './time-space';
import type { YMetric } from './time-space';

/** The board to play on: random, or built from a formula of one of the TQBF tab's kinds. */
export type GeoBoard = 'random' | QbfKind;
export const GEO_BOARDS: readonly GeoBoard[] = ['random', ...QBF_KINDS.map((k) => k.id)];
export const MAX_BOARD_N = 10;
export const MAX_FORMULA_N = 4;
export const GEO_ALGO_ID = 'time-space/geography';

interface GeographyState {
  board: GeoBoard;
  /** Vertices for a random board, variables for a formula's board. */
  n: number;
  seed: number;
  /** The game so far: the token's path, start first. */
  path: number[];
  reveal: boolean;
  step: number;
  benchKind: GeoKind;
  yMetric: YMetric;
  predictions: Partial<Record<string, ComplexityClass>>;
  bench: BenchmarkPoint[];
  benchRunning: boolean;
  configure: (c: Partial<Pick<GeographyState, 'board' | 'n' | 'seed'>>) => void;
  /** Empty for a new game: the token on the board's start vertex. */
  setPath: (path: number[]) => void;
  setReveal: (r: boolean) => void;
  setStep: (s: number) => void;
  setBenchKind: (k: GeoKind) => void;
  setYMetric: (m: YMetric) => void;
  predict: (key: string, c: ComplexityClass) => void;
  runBench: () => void;
}

export const maxNFor = (board: GeoBoard) => (board === 'random' ? MAX_BOARD_N : MAX_FORMULA_N);

export const useGeographyStore = create<GeographyState>()((set, get) => {
  let cancel = () => {};
  const board = enumParam('gb', GEO_BOARDS, 'alternating');
  return {
    board,
    n: intParam('gn', 3, 1, maxNFor(board)),
    seed: intParam('gseed', 1, 0, 1e9),
    path: [],
    reveal: false,
    step: intParam('gstep', 0, 0, 1e6),
    benchKind: enumParam('gk', GEO_KINDS.map((k) => k.id), 'exists-unsat'),
    yMetric: enumParam('gy', Y_METRICS, 'ops'),
    predictions: {},
    bench: [],
    benchRunning: false,

    configure: (c) =>
      set((s) => {
        const b = c.board ?? s.board;
        return { ...c, n: Math.min(c.n ?? s.n, maxNFor(b)), path: [], step: 0 };
      }),
    setPath: (path) => set({ path }),
    setReveal: (reveal) => set({ reveal }),
    setStep: (step) => set({ step: Math.max(0, step) }),
    setBenchKind: (benchKind) => {
      cancel();
      set({ benchKind, bench: [], benchRunning: false });
    },
    setYMetric: (yMetric) => set({ yMetric }),
    predict: (key, c) => set((s) => ({ predictions: { ...s.predictions, [key]: c } })),
    runBench: () => {
      cancel();
      const { benchKind } = get();
      set({ benchRunning: true, bench: [] });
      cancel = runBenchmarks(
        [{ algoId: GEO_ALGO_ID, nValues: benchSizes(findAlgorithm(GEO_ALGO_ID), benchKind), inputKind: benchKind, seed: 1 }],
        (p) => set((s) => ({ bench: [...s.bench, p] })),
        () => set({ benchRunning: false }),
      );
    },
  };
});
