import { create } from 'zustand';
import { CYCLE_KINDS } from '../algorithms/cycle/input';
import type { CycleKind } from '../algorithms/cycle/input';
import { runBenchmarks } from '../engine/benchmark';
import type { BenchmarkPoint } from '../engine/benchmark-core';
import type { ComplexityClass } from '../engine/complexity';
import { benchSizes, findAlgorithm } from '../modules/registry';
import { enumParam, intParam } from './url-state';
import { Y_METRICS } from './time-space';
import type { YMetric } from './time-space';

export const CYCLE_ALGOS = ['cycle-hash', 'cycle-floyd'] as const;
export type CycleAlgo = (typeof CYCLE_ALGOS)[number];
export const cycleAlgoId = (a: CycleAlgo) => `time-space/${a}`;
export const MAX_CYCLE_N = 40;

interface CycleState {
  n: number;
  kind: CycleKind;
  seed: number;
  step: number;
  yMetric: YMetric;
  /** Keyed by algorithm and plotted metric: each has its own class. */
  predictions: Partial<Record<string, ComplexityClass>>;
  bench: Partial<Record<CycleAlgo, BenchmarkPoint[]>>;
  benchRunning: boolean;
  configure: (c: Partial<Pick<CycleState, 'n' | 'kind' | 'seed'>>) => void;
  setStep: (s: number) => void;
  setYMetric: (m: YMetric) => void;
  predict: (key: string, c: ComplexityClass) => void;
  runBench: () => void;
}

export const useCycleStore = create<CycleState>()((set, get) => {
  let cancel = () => {};
  return {
    n: intParam('cn', 14, 1, MAX_CYCLE_N),
    kind: enumParam('ck', CYCLE_KINDS.map((k) => k.id), 'balanced'),
    seed: intParam('cseed', 1, 0, 1e9),
    step: intParam('cstep', 0, 0, 1e6),
    yMetric: enumParam('cy', Y_METRICS, 'mem'),
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
      set({ benchRunning: true, bench: { 'cycle-hash': [], 'cycle-floyd': [] } });
      const byId = Object.fromEntries(CYCLE_ALGOS.map((a) => [cycleAlgoId(a), a])) as Record<string, CycleAlgo>;
      cancel = runBenchmarks(
        CYCLE_ALGOS.map((a) => ({ algoId: cycleAlgoId(a), nValues: benchSizes(findAlgorithm(cycleAlgoId(a)), kind), inputKind: kind, seed: 1 })),
        (p) => {
          const a = byId[p.algoId]!;
          set((s) => ({ bench: { ...s.bench, [a]: [...(s.bench[a] ?? []), p] } }));
        },
        () => set({ benchRunning: false }),
      );
    },
  };
});
