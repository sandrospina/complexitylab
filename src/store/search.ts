import { create } from 'zustand';
import type { SearchInputKind } from '../algorithms/search/input';
import { powersOfTwo, runBenchmarks } from '../engine/benchmark';
import type { BenchmarkPoint } from '../engine/benchmark-core';
import type { ComplexityClass } from '../engine/complexity';
import { enumParam, intParam } from './url-state';

export const SEARCH_MODES = ['linear', 'binary', 'race'] as const;
export type SearchMode = (typeof SEARCH_MODES)[number];
export type SearchAlgo = 'linear' | 'binary';

export const ALGO_ID: Record<SearchAlgo, string> = { linear: 'search/linear', binary: 'search/binary' };
export const modeAlgos = (m: SearchMode): SearchAlgo[] => (m === 'race' ? ['linear', 'binary'] : [m]);
export const BENCH_N = powersOfTwo(4, 20);
export const MAX_ANIM_N = 64;

interface Config {
  mode: SearchMode;
  n: number;
  kind: SearchInputKind;
  seed: number;
}

interface SearchState extends Config {
  step: number;
  predictions: Partial<Record<SearchAlgo, ComplexityClass>>;
  bench: Partial<Record<SearchAlgo, BenchmarkPoint[]>>;
  benchRunning: boolean;
  configure: (c: Partial<Config>) => void;
  setStep: (s: number) => void;
  predict: (a: SearchAlgo, c: ComplexityClass) => void;
  runBench: () => void;
}

export const useSearchStore = create<SearchState>()((set, get) => {
  let cancel = () => {};

  return {
    mode: enumParam('algo', SEARCH_MODES, 'binary'),
    n: intParam('n', 16, 1, MAX_ANIM_N),
    kind: enumParam('kind', ['worst', 'random'] as const, 'worst'),
    seed: intParam('seed', 1, 0, 1e9),
    step: intParam('step', 0, 0, 1e6),
    predictions: {},
    bench: {},
    benchRunning: false,

    configure: (c) => {
      // Benchmarks depend on the input kind and seed, not on the animated n or the mode.
      const stale = (c.kind !== undefined && c.kind !== get().kind) || (c.seed !== undefined && c.seed !== get().seed);
      set({ ...c, step: 0, ...(stale ? { bench: {} } : {}) });
    },
    setStep: (step) => set({ step: Math.max(0, step) }),
    predict: (a, c) => set((s) => ({ predictions: { ...s.predictions, [a]: c } })),

    runBench: () => {
      cancel();
      const { mode, kind, seed } = get();
      const algos = modeAlgos(mode);
      const byId = Object.fromEntries(algos.map((a) => [ALGO_ID[a], a])) as Record<string, SearchAlgo>;
      set((s) => ({ benchRunning: true, bench: { ...s.bench, ...Object.fromEntries(algos.map((a) => [a, []])) } }));
      cancel = runBenchmarks(
        algos.map((a) => ({ algoId: ALGO_ID[a], nValues: BENCH_N, inputKind: kind, seed })),
        (p) => {
          const a = byId[p.algoId]!;
          set((s) => ({ bench: { ...s.bench, [a]: [...(s.bench[a] ?? []), p] } }));
        },
        () => set({ benchRunning: false }),
      );
    },
  };
});
