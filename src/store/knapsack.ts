import { create } from 'zustand';
import type { KnapsackKind } from '../algorithms/knapsack/input';
import { runBenchmarks } from '../engine/benchmark';
import type { BenchmarkPoint } from '../engine/benchmark-core';
import type { ComplexityClass } from '../engine/complexity';
import { benchSizes, findAlgorithm } from '../modules/registry';
import { enumParam, intParam } from './url-state';

export const KNAPSACK_ALGOS = ['brute', 'dp'] as const;
export type KnapsackAlgo = (typeof KNAPSACK_ALGOS)[number];
export const AXES = ['items', 'bits'] as const satisfies readonly KnapsackKind[];

export const MAX_ITEMS = 8;
export const MIN_BITS = 3;
export const MAX_BITS = 20;
/** The DP is animated only while its table is small; larger tables run in the worker only. */
export const MAX_ANIM_CELLS = 2 ** 14;

export const knapsackAlgoId = (a: KnapsackAlgo) => `knapsack/${a}`;

interface KnapsackState {
  n: number;
  bits: number;
  seed: number;
  step: number;
  axis: KnapsackKind;
  predictions: Partial<Record<KnapsackAlgo, ComplexityClass>>;
  bench: Partial<Record<KnapsackAlgo, BenchmarkPoint[]>>;
  benchRunning: boolean;
  configure: (c: Partial<Pick<KnapsackState, 'n' | 'bits' | 'seed'>>) => void;
  setStep: (s: number) => void;
  setAxis: (a: KnapsackKind) => void;
  predict: (a: KnapsackAlgo, c: ComplexityClass) => void;
  runBench: () => void;
}

export const useKnapsackStore = create<KnapsackState>()((set, get) => {
  let cancel = () => {};
  return {
    n: intParam('n', 6, 1, MAX_ITEMS),
    bits: intParam('b', 5, MIN_BITS, MAX_BITS),
    seed: intParam('seed', 1, 0, 1e9),
    step: intParam('step', 0, 0, 1e6),
    axis: enumParam('axis', AXES, 'bits'),
    predictions: {},
    bench: {},
    benchRunning: false,

    configure: (c) => set({ ...c, step: 0 }),
    setStep: (step) => set({ step: Math.max(0, step) }),
    // Predictions and results are per axis: the same algorithm has a different class on each.
    setAxis: (axis) => {
      cancel();
      set({ axis, predictions: {}, bench: {}, benchRunning: false });
    },
    predict: (a, c) => set((s) => ({ predictions: { ...s.predictions, [a]: c } })),
    runBench: () => {
      cancel();
      const { axis } = get();
      set({ benchRunning: true, bench: { brute: [], dp: [] } });
      const byId = Object.fromEntries(KNAPSACK_ALGOS.map((a) => [knapsackAlgoId(a), a])) as Record<string, KnapsackAlgo>;
      cancel = runBenchmarks(
        KNAPSACK_ALGOS.map((a) => ({
          algoId: knapsackAlgoId(a),
          nValues: benchSizes(findAlgorithm(knapsackAlgoId(a)), axis),
          inputKind: axis,
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
