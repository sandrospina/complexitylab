import { create } from 'zustand';
import { runBenchmarks } from '../engine/benchmark';
import type { BenchmarkPoint } from '../engine/benchmark-core';
import type { ComplexityClass } from '../engine/complexity';
import { benchSizes, findAlgorithm } from '../modules/registry';
import { enumParam, intParam } from './url-state';

export const FIB_ALGOS = ['naive', 'memo', 'iterative'] as const;
export type FibAlgo = (typeof FIB_ALGOS)[number];
export const TABS = ['fib', 'cycle', 'lcs'] as const;
export type Tab = (typeof TABS)[number];
export const Y_METRICS = ['ops', 'mem'] as const;
export type YMetric = (typeof Y_METRICS)[number];

export const fibAlgoId = (a: FibAlgo) => `time-space/${a}`;
/** Largest n each algorithm animates: the naive call tree has 2·fib(n+1) − 1 nodes. */
export const maxN = (a: FibAlgo) => findAlgorithm(fibAlgoId(a)).maxAnimN;

interface TimeSpaceState {
  tab: Tab;
  setTab: (t: Tab) => void;
  algo: FibAlgo;
  n: number;
  step: number;
  yMetric: YMetric;
  predictions: Partial<Record<FibAlgo, ComplexityClass>>;
  bench: Partial<Record<FibAlgo, BenchmarkPoint[]>>;
  benchRunning: boolean;
  /** Switching algorithm keeps the timeline position, so the collapse can be watched mid-run. */
  setAlgo: (a: FibAlgo) => void;
  setN: (n: number) => void;
  setStep: (s: number) => void;
  setYMetric: (m: YMetric) => void;
  predict: (a: FibAlgo, c: ComplexityClass) => void;
  runBench: () => void;
}

export const useTimeSpaceStore = create<TimeSpaceState>()((set) => {
  let cancel = () => {};
  const algo = enumParam('algo', FIB_ALGOS, 'naive');
  return {
    tab: enumParam('tab', TABS, 'fib'),
    setTab: (tab) => set({ tab }),
    algo,
    n: intParam('n', 8, 1, maxN(algo)),
    step: intParam('step', 0, 0, 1e6),
    yMetric: enumParam('y', Y_METRICS, 'ops'),
    predictions: {},
    bench: {},
    benchRunning: false,

    setAlgo: (a) => set((s) => ({ algo: a, n: Math.min(s.n, maxN(a)) })),
    setN: (n) => set({ n, step: 0 }),
    setStep: (step) => set({ step: Math.max(0, step) }),
    setYMetric: (yMetric) => set({ yMetric }),
    predict: (a, c) => set((s) => ({ predictions: { ...s.predictions, [a]: c } })),

    runBench: () => {
      cancel();
      set({ benchRunning: true, bench: Object.fromEntries(FIB_ALGOS.map((a) => [a, []])) });
      const byId = Object.fromEntries(FIB_ALGOS.map((a) => [fibAlgoId(a), a])) as Record<string, FibAlgo>;
      cancel = runBenchmarks(
        FIB_ALGOS.map((a) => ({
          algoId: fibAlgoId(a),
          nValues: benchSizes(findAlgorithm(fibAlgoId(a))),
          inputKind: 'n',
          seed: 1,
        })),
        (p) => {
          const a = byId[p.algoId]!;
          set((s) => ({ bench: { ...s.bench, [a]: [...(s.bench[a] ?? []), p] } }));
        },
        () => set({ benchRunning: false }),
      );
    },
  };
});
