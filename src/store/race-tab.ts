import { create } from 'zustand';
import { runBenchmarks } from '../engine/benchmark';
import type { BenchmarkPoint } from '../engine/benchmark-core';
import type { ComplexityClass } from '../engine/complexity';
import { benchSizes, findAlgorithm } from '../modules/registry';
import { enumParam, intParam } from './url-state';
import { Y_METRICS } from './time-space';
import type { YMetric } from './time-space';

/** A Time–space tab: one input (n, kind, seed) raced by several algorithms, and their scaling runs. */
export interface RaceTabState<A extends string, K extends string> {
  n: number;
  kind: K;
  seed: number;
  step: number;
  yMetric: YMetric;
  /** Keyed by algorithm and plotted metric: each has its own class. */
  predictions: Partial<Record<string, ComplexityClass>>;
  bench: Partial<Record<A, BenchmarkPoint[]>>;
  benchRunning: boolean;
  configure: (c: Partial<Pick<RaceTabState<A, K>, 'n' | 'kind' | 'seed'>>) => void;
  setStep: (s: number) => void;
  setYMetric: (m: YMetric) => void;
  predict: (key: string, c: ComplexityClass) => void;
  runBench: () => void;
}

interface Options<A extends string, K extends string> {
  /** Registry ids are `time-space/<algo>`. */
  algos: readonly A[];
  kinds: readonly K[];
  /** URL params are this prefix plus n, k, seed, step and y. */
  prefix: string;
  n: number;
  maxN: number;
  kind: K;
  yMetric?: YMetric;
}

export const timeSpaceId = (a: string) => `time-space/${a}`;

export function createRaceTabStore<A extends string, K extends string>(o: Options<A, K>) {
  const p = o.prefix;
  return create<RaceTabState<A, K>>()((set, get) => {
    let cancel = () => {};
    return {
      n: intParam(`${p}n`, o.n, 1, o.maxN),
      kind: enumParam(`${p}k`, o.kinds, o.kind),
      seed: intParam(`${p}seed`, 1, 0, 1e9),
      step: intParam(`${p}step`, 0, 0, 1e6),
      yMetric: enumParam(`${p}y`, Y_METRICS, o.yMetric ?? 'mem'),
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
        set({ benchRunning: true, bench: Object.fromEntries(o.algos.map((a) => [a, [] as BenchmarkPoint[]])) as Partial<Record<A, BenchmarkPoint[]>> });
        const byId = Object.fromEntries(o.algos.map((a) => [timeSpaceId(a), a])) as Record<string, A>;
        cancel = runBenchmarks(
          o.algos.map((a) => ({ algoId: timeSpaceId(a), nValues: benchSizes(findAlgorithm(timeSpaceId(a)), kind), inputKind: kind, seed: 1 })),
          (pt) => {
            const a = byId[pt.algoId]!;
            set((s) => ({ bench: { ...s.bench, [a]: [...(s.bench[a] ?? []), pt] } }));
          },
          () => set({ benchRunning: false }),
        );
      },
    };
  });
}

/** The tab's state as URL params, matching the keys the store reads on load. */
export const raceTabParams = (prefix: string, s: { n: number; kind: string; seed: number; step: number; yMetric: string }) => ({
  [`${prefix}n`]: s.n,
  [`${prefix}k`]: s.kind,
  [`${prefix}seed`]: s.seed,
  [`${prefix}step`]: s.step,
  [`${prefix}y`]: s.yMetric,
});
