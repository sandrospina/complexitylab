import { create } from 'zustand';
import { shuffle } from '../algorithms/sort/input';
import type { SortInputKind } from '../algorithms/sort/input';
import { runBenchmarks } from '../engine/benchmark';
import type { BenchmarkPoint } from '../engine/benchmark-core';
import type { ComplexityClass } from '../engine/complexity';
import { mulberry32 } from '../engine/rng';
import { benchSizes, findAlgorithm } from '../modules/registry';
import { enumParam, intParam } from './url-state';

export const SORT_ALGOS = ['bubble', 'insertion', 'merge', 'quick-naive', 'quick-random'] as const;
export type SortAlgo = (typeof SORT_ALGOS)[number];
export const TREE_ALGOS = ['merge', 'quick-naive', 'quick-random', 'binary'] as const;
export type TreeAlgo = (typeof TREE_ALGOS)[number];
export const TABS = ['explore', 'adversary', 'tree'] as const;
export type Tab = (typeof TABS)[number];
const PRESETS = ['random', 'sorted', 'reversed', 'fewUnique'] as const;

export const MAX_SORT_N = 48;
export const ADV_MIN_N = 8;
export const ADV_MAX_N = 16;

export const algoId = (a: SortAlgo) => `sorting/${a}`;

export const shuffled = (n: number, seed: number) =>
  shuffle(Array.from({ length: n }, (_, i) => i + 1), mulberry32(seed));

/** Accepts only a permutation of 1..k with ADV_MIN_N ≤ k ≤ ADV_MAX_N. */
export function parsePermutation(raw: string | null): number[] | undefined {
  if (!raw) return undefined;
  const arr = raw.split(',').map(Number);
  const k = arr.length;
  if (k < ADV_MIN_N || k > ADV_MAX_N) return undefined;
  const seen = new Set(arr);
  return seen.size === k && arr.every((v) => Number.isInteger(v) && v >= 1 && v <= k) ? arr : undefined;
}

interface Config {
  /** The sorts on the explore tab: raced together and plotted together, in SORT_ALGOS order. */
  algos: SortAlgo[];
  n: number;
  preset: SortInputKind;
  seed: number;
  treeAlgo: TreeAlgo;
}

interface SortingState extends Config {
  tab: Tab;
  step: number;
  advAlgo: SortAlgo;
  advArr: number[];
  /** Most compares the student has forced, per algorithm, this session. */
  advBest: Partial<Record<SortAlgo, number>>;
  predictions: Partial<Record<SortAlgo, ComplexityClass>>;
  bench: Partial<Record<SortAlgo, BenchmarkPoint[]>>;
  benchRunning: boolean;
  setTab: (t: Tab) => void;
  configure: (c: Partial<Config>) => void;
  setStep: (s: number) => void;
  /** Adds or removes a sort from the comparison; the last one cannot be removed. */
  toggleAlgo: (a: SortAlgo) => void;
  selectAll: () => void;
  setAdversary: (a: { algo?: SortAlgo; arr?: number[] }, score: number) => void;
  predict: (a: SortAlgo, c: ComplexityClass) => void;
  runBench: () => void;
}

/** `algos=a,b,c`, or the older `algo=a&vs=b` links; always at least one, in SORT_ALGOS order. */
export function parseAlgos(params: URLSearchParams): SortAlgo[] {
  const valid = (x: string | null): x is SortAlgo => SORT_ALGOS.includes(x as SortAlgo);
  const listed = (params.get('algos') ?? '').split(',').filter(valid);
  const legacy = [params.get('algo'), params.get('vs')].filter(valid);
  const chosen = new Set(listed.length ? listed : legacy.length ? legacy : (['insertion'] as SortAlgo[]));
  return SORT_ALGOS.filter((a) => chosen.has(a));
}

export const useSortingStore = create<SortingState>()((set, get) => {
  let cancel = () => {};
  const advArr = parsePermutation(new URLSearchParams(location.search).get('adv')) ?? shuffled(10, 1);
  return {
    tab: enumParam('tab', TABS, 'explore'),
    algos: parseAlgos(new URLSearchParams(location.search)),
    n: intParam('n', 24, 2, MAX_SORT_N),
    preset: enumParam('preset', PRESETS, 'random'),
    seed: intParam('seed', 1, 0, 1e9),
    treeAlgo: enumParam('talgo', TREE_ALGOS, 'merge'),
    step: intParam('step', 0, 0, 1e6),
    advAlgo: enumParam('aalgo', SORT_ALGOS, 'quick-naive'),
    advArr,
    advBest: {},
    predictions: {},
    bench: {},
    benchRunning: false,

    setTab: (tab) => set({ tab, step: 0 }),
    configure: (c) => {
      const s = get();
      const stale = (c.preset !== undefined && c.preset !== s.preset) || (c.seed !== undefined && c.seed !== s.seed);
      set({ ...c, step: 0, ...(stale ? { bench: {} } : {}) });
    },
    setStep: (step) => set({ step: Math.max(0, step) }),
    toggleAlgo: (a) =>
      set((s) => {
        const on = s.algos.includes(a);
        if (on && s.algos.length === 1) return {};
        return { algos: SORT_ALGOS.filter((x) => (x === a ? !on : s.algos.includes(x))), step: 0 };
      }),
    selectAll: () => set({ algos: [...SORT_ALGOS], step: 0 }),
    setAdversary: ({ algo, arr }, score) =>
      set((s) => {
        const a = algo ?? s.advAlgo;
        return {
          advAlgo: a,
          advArr: arr ?? s.advArr,
          advBest: { ...s.advBest, [a]: Math.max(s.advBest[a] ?? 0, score) },
        };
      }),
    predict: (a, c) => set((s) => ({ predictions: { ...s.predictions, [a]: c } })),

    runBench: () => {
      cancel();
      const { preset, seed } = get();
      const { algos } = get();
      const byId = Object.fromEntries(algos.map((a) => [algoId(a), a])) as Record<string, SortAlgo>;
      set((s) => ({ benchRunning: true, bench: { ...s.bench, ...Object.fromEntries(algos.map((a) => [a, []])) } }));
      cancel = runBenchmarks(
        algos.map((a) => ({
          algoId: algoId(a),
          nValues: benchSizes(findAlgorithm(algoId(a))),
          inputKind: preset,
          seed,
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
