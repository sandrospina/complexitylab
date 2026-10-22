import { create } from 'zustand';
import type { Point } from '../algorithms/tsp/input';
import { CANVAS } from '../algorithms/graph/presets';
import { runBenchmarks } from '../engine/benchmark';
import type { BenchmarkPoint } from '../engine/benchmark-core';
import type { ComplexityClass } from '../engine/complexity';
import { mulberry32 } from '../engine/rng';
import { benchSizes, findAlgorithm } from '../modules/registry';
import { intParam } from './url-state';

export const TSP_ALGOS = ['brute', 'held-karp', 'heuristic'] as const;
export type TspAlgo = (typeof TSP_ALGOS)[number];
export const tspAlgoId = (a: TspAlgo) => `tsp/${a}`;

export const MAX_CITIES = 20;
/** Above these, the exact algorithms are only estimated: they would pass the solve budget. */
export const EXACT_CAP: Record<TspAlgo, number> = { brute: 10, 'held-karp': 16, heuristic: MAX_CITIES };

/** k cities scattered over the canvas, away from its edges. */
export function randomCities(k: number, seed: number): Point[] {
  const rng = mulberry32(seed);
  return Array.from({ length: k }, () => [
    Math.round(30 + rng() * (CANVAS.width - 60)),
    Math.round(30 + rng() * (CANVAS.height - 60)),
  ]);
}

export const encodeCities = (pts: Point[]) => pts.map(([x, y]) => `${Math.round(x)},${Math.round(y)}`).join(';');

export function decodeCities(raw: string | null): Point[] | undefined {
  if (!raw) return undefined;
  const pts = raw.split(';').map((xy) => xy.split(',').map(Number));
  return pts.length <= MAX_CITIES && pts.every((p) => p.length === 2 && p.every(Number.isFinite))
    ? (pts as Point[])
    : undefined;
}

interface TspState {
  cities: Point[];
  /** Cities came from the seeded preset (then the URL stores k and seed, not the list). */
  preset: { k: number; seed: number } | undefined;
  step: number;
  predictions: Partial<Record<TspAlgo, ComplexityClass>>;
  bench: Partial<Record<TspAlgo, BenchmarkPoint[]>>;
  benchRunning: boolean;
  loadPreset: (k: number, seed: number) => void;
  addCity: (p: Point) => void;
  clear: () => void;
  setStep: (s: number) => void;
  predict: (a: TspAlgo, c: ComplexityClass) => void;
  runBench: () => void;
}

export const useTspStore = create<TspState>()((set, get) => {
  let cancel = () => {};
  const fromUrl = decodeCities(new URLSearchParams(location.search).get('c'));
  const k = intParam('k', 8, 2, MAX_CITIES);
  const seed = intParam('seed', 1, 0, 1e9);
  return {
    cities: fromUrl ?? randomCities(k, seed),
    preset: fromUrl ? undefined : { k, seed },
    step: intParam('step', 0, 0, 1e6),
    predictions: {},
    bench: {},
    benchRunning: false,

    loadPreset: (k, seed) => set({ cities: randomCities(k, seed), preset: { k, seed }, step: 0 }),
    addCity: (p) => {
      if (get().cities.length < MAX_CITIES) set((s) => ({ cities: [...s.cities, p], preset: undefined, step: 0 }));
    },
    clear: () => set({ cities: [], preset: undefined, step: 0 }),
    setStep: (step) => set({ step: Math.max(0, step) }),
    predict: (a, c) => set((s) => ({ predictions: { ...s.predictions, [a]: c } })),
    runBench: () => {
      cancel();
      set({ benchRunning: true, bench: Object.fromEntries(TSP_ALGOS.map((a) => [a, []])) });
      const byId = Object.fromEntries(TSP_ALGOS.map((a) => [tspAlgoId(a), a])) as Record<string, TspAlgo>;
      cancel = runBenchmarks(
        TSP_ALGOS.map((a) => ({
          algoId: tspAlgoId(a),
          nValues: benchSizes(findAlgorithm(tspAlgoId(a)), 'random'),
          inputKind: 'random',
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
