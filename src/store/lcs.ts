import { create } from 'zustand';
import { LCS_KINDS } from '../algorithms/lcs/input';
import type { LcsKind } from '../algorithms/lcs/input';
import { runBenchmarks } from '../engine/benchmark';
import type { BenchmarkPoint } from '../engine/benchmark-core';
import type { ComplexityClass } from '../engine/complexity';
import { benchSizes, findAlgorithm } from '../modules/registry';
import { enumParam, intParam } from './url-state';
import { Y_METRICS } from './time-space';
import type { YMetric } from './time-space';

export const LCS_ALGOS = ['lcs-table', 'lcs-rows', 'lcs-hirschberg'] as const;
export type LcsAlgo = (typeof LCS_ALGOS)[number];
export const lcsAlgoId = (a: LcsAlgo) => `time-space/${a}`;
export const MAX_LCS_N = 14;

interface LcsState {
  n: number;
  kind: LcsKind;
  seed: number;
  step: number;
  yMetric: YMetric;
  /** Keyed by algorithm and plotted metric. */
  predictions: Partial<Record<string, ComplexityClass>>;
  bench: Partial<Record<LcsAlgo, BenchmarkPoint[]>>;
  benchRunning: boolean;
  configure: (c: Partial<Pick<LcsState, 'n' | 'kind' | 'seed'>>) => void;
  setStep: (s: number) => void;
  setYMetric: (m: YMetric) => void;
  predict: (key: string, c: ComplexityClass) => void;
  runBench: () => void;
}

export const useLcsStore = create<LcsState>()((set, get) => {
  let cancel = () => {};
  return {
    n: intParam('ln', 10, 1, MAX_LCS_N),
    kind: enumParam('lk', LCS_KINDS.map((k) => k.id), 'random'),
    seed: intParam('lseed', 1, 0, 1e9),
    step: intParam('lstep', 0, 0, 1e6),
    yMetric: enumParam('ly', Y_METRICS, 'mem'),
    predictions: {},
    bench: {},
    benchRunning: false,

    configure: (c) => {
      const stale = c.kind !== undefined && c.kind !== get().kind;
      if (stale) cancel();
      set({ ...c, step: 0, ...(stale ? { bench: {}, benchRunning: false } : {}) });
    },
    setStep: (step) => set({ step: Math.max(0, step) }),
    setYMetric: (yMetric) => set({ yMetric }),
    predict: (key, c) => set((s) => ({ predictions: { ...s.predictions, [key]: c } })),
    runBench: () => {
      cancel();
      const { kind } = get();
      set({ benchRunning: true, bench: Object.fromEntries(LCS_ALGOS.map((a) => [a, []])) });
      const byId = Object.fromEntries(LCS_ALGOS.map((a) => [lcsAlgoId(a), a])) as Record<string, LcsAlgo>;
      cancel = runBenchmarks(
        LCS_ALGOS.map((a) => ({ algoId: lcsAlgoId(a), nValues: benchSizes(findAlgorithm(lcsAlgoId(a)), kind), inputKind: kind, seed: 1 })),
        (p) => {
          const a = byId[p.algoId]!;
          set((s) => ({ bench: { ...s.bench, [a]: [...(s.bench[a] ?? []), p] } }));
        },
        () => set({ benchRunning: false }),
      );
    },
  };
});
