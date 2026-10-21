import { create } from 'zustand';
import { addVertex, decodeGraph, toggleEdge } from '../algorithms/graph/graph';
import type { Graph } from '../algorithms/graph/graph';
import { TRAVERSAL_KINDS } from '../algorithms/graph/input';
import type { TraversalKind } from '../algorithms/graph/input';
import { makePreset, MAX_EDITOR_N, PRESETS } from '../algorithms/graph/presets';
import type { PresetId } from '../algorithms/graph/presets';
import { runBenchmarks } from '../engine/benchmark';
import type { BenchmarkPoint } from '../engine/benchmark-core';
import { benchSizes, findAlgorithm } from '../modules/registry';
import { enumParam, intParam } from './url-state';

export const TABS = ['traversal', 'dijkstra'] as const;
export type Tab = (typeof TABS)[number];
export const TRAVERSALS = ['bfs', 'dfs'] as const;
export type Traversal = (typeof TRAVERSALS)[number];
export const DIJKSTRAS = ['dijkstra-array', 'dijkstra-heap'] as const;
export type Dijkstra = (typeof DIJKSTRAS)[number];
/** Average-degree slider stops; the last is the complete graph. */
export const DEGREES = ['2', '4', '8', '16', '32', '64', '128', 'complete'] as const;
export type Degree = (typeof DEGREES)[number];
export const T_METRICS = ['frontier', 'ops'] as const;
export type TMetric = (typeof T_METRICS)[number];

export const graphAlgoId = (a: Traversal | Dijkstra) => `graphs/${a}`;

interface GraphsState {
  tab: Tab;
  graph: Graph;
  /** The preset the graph came from, until the student edits it. */
  preset: PresetId | 'custom';
  source: number;
  step: number;
  tKind: TraversalKind;
  tMetric: TMetric;
  degree: Degree;
  bench: Partial<Record<Traversal | Dijkstra, BenchmarkPoint[]>>;
  benchRunning: boolean;
  setTab: (t: Tab) => void;
  loadPreset: (p: PresetId) => void;
  clear: () => void;
  addVertex: (xy: [number, number]) => void;
  toggleEdge: (u: number, v: number) => void;
  setSource: (s: number) => void;
  setStep: (s: number) => void;
  setTKind: (k: TraversalKind) => void;
  setTMetric: (m: TMetric) => void;
  setDegree: (d: Degree) => void;
  runTraversalBench: () => void;
  runDijkstraBench: () => void;
}

export const useGraphsStore = create<GraphsState>()((set, get) => {
  let cancel = () => {};
  const fromUrl = decodeGraph(new URLSearchParams(location.search).get('g'), MAX_EDITOR_N);
  const preset = enumParam('preset', PRESETS.map((p) => p.id), 'tree');
  const graph = fromUrl ?? makePreset(preset);
  const edited = (g: Graph) => ({ graph: g, preset: 'custom' as const, step: 0 });

  const run = (algos: (Traversal | Dijkstra)[], kind: string, param?: number) => {
    cancel();
    set((s) => ({ benchRunning: true, bench: { ...s.bench, ...Object.fromEntries(algos.map((a) => [a, []])) } }));
    const byId = Object.fromEntries(algos.map((a) => [graphAlgoId(a), a])) as Record<string, Traversal | Dijkstra>;
    cancel = runBenchmarks(
      algos.map((a) => ({
        algoId: graphAlgoId(a),
        nValues: benchSizes(findAlgorithm(graphAlgoId(a))),
        inputKind: kind,
        param,
        seed: 1,
      })),
      (p) => {
        const a = byId[p.algoId]!;
        set((s) => ({ bench: { ...s.bench, [a]: [...(s.bench[a] ?? []), p] } }));
      },
      () => set({ benchRunning: false }),
    );
  };

  return {
    tab: enumParam('tab', TABS, 'traversal'),
    graph,
    preset: fromUrl ? 'custom' : preset,
    source: intParam('src', 0, 0, Math.max(0, graph.n - 1)),
    step: intParam('step', 0, 0, 1e6),
    tKind: enumParam('tk', TRAVERSAL_KINDS.map((k) => k.id), 'tree'),
    tMetric: enumParam('tm', T_METRICS, 'frontier'),
    degree: enumParam('deg', DEGREES, '4'),
    bench: {},
    benchRunning: false,

    setTab: (tab) => set({ tab, step: 0 }),
    loadPreset: (p) => set({ graph: makePreset(p), preset: p, source: 0, step: 0 }),
    clear: () => set({ ...edited({ n: 0, adj: [], w: [], pos: [] }), source: 0 }),
    addVertex: (xy) => {
      if (get().graph.n < MAX_EDITOR_N) set(edited(addVertex(get().graph, xy)));
    },
    toggleEdge: (u, v) => set(edited(toggleEdge(get().graph, u, v))),
    setSource: (source) => set({ source, step: 0 }),
    setStep: (step) => set({ step: Math.max(0, step) }),
    setTKind: (tKind) => {
      cancel();
      set((s) => ({ tKind, benchRunning: false, bench: { ...s.bench, bfs: undefined, dfs: undefined } }));
    },
    setTMetric: (tMetric) => set({ tMetric }),
    setDegree: (degree) => {
      set({ degree });
      get().runDijkstraBench();
    },
    runTraversalBench: () => run([...TRAVERSALS], get().tKind),
    runDijkstraBench: () => {
      const d = get().degree;
      run([...DIJKSTRAS], d === 'complete' ? 'complete' : 'degree', d === 'complete' ? undefined : Number(d));
    },
  };
});
