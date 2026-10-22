import { create } from 'zustand';
import { decodeGraph, encodeGraph } from '../algorithms/graph/graph';
import type { Graph } from '../algorithms/graph/graph';
import { decodeCircuit, EXAMPLE_CIRCUIT } from '../algorithms/reductions/circuit';
import type { Circuit } from '../algorithms/reductions/circuit';
import type { MachineRun } from '../algorithms/reductions/cook-levin';
import { GRAPH_PRESETS, makeGraphPreset } from '../algorithms/reductions/presets';
import type { GraphPresetId } from '../algorithms/reductions/presets';
import { runBenchmarks } from '../engine/benchmark';
import type { BenchmarkPoint } from '../engine/benchmark-core';
import { benchSizes, findAlgorithm } from '../modules/registry';
import { enumParam, intParam } from './url-state';
import { SIZES } from './verify';
import type { Size } from './verify';

export const TABS = ['lecture', 'coloring', 'clique', 'hamiltonian', 'sudoku', 'circuit', 'quiz', 'cook'] as const;
export type Tab = (typeof TABS)[number];
export type GraphTab = 'coloring' | 'clique' | 'hamiltonian';
export const MAX_GRAPH_N = 14;
export const MAX_WIRES = 16;
export const MAX_K = 6;

export const encoderId = (t: GraphTab | 'sudoku' | 'circuit' | 'cook') =>
  `reductions/${t === 'circuit' ? 'tseitin' : t === 'cook' ? 'cook-levin' : t}`;

interface ReductionsState {
  tab: Tab;
  graph: Graph;
  preset: GraphPresetId | 'custom';
  k: number;
  /** Clause families left out, per tab (break-it mode). */
  omit: string[];
  size: Size;
  seed: number;
  circuit: Circuit;
  machine: MachineRun;
  lecture: number;
  /** Quiz answers by question: true when the arrow points from the known problem. */
  quiz: Record<number, boolean>;
  bench: Record<string, BenchmarkPoint[]>;
  benchRunning: string | undefined;
  setTab: (t: Tab) => void;
  setLecture: (i: number) => void;
  loadPreset: (p: GraphPresetId) => void;
  setGraph: (g: Graph) => void;
  setK: (k: number) => void;
  setOmit: (omit: string[]) => void;
  setPuzzle: (size: Size, seed: number) => void;
  setCircuit: (c: Circuit) => void;
  setMachine: (m: MachineRun) => void;
  answer: (q: number, correct: boolean) => void;
  runCounter: (algoId: string) => void;
}

export const useReductionsStore = create<ReductionsState>()((set) => {
  let cancel = () => {};
  const params = new URLSearchParams(location.search);
  const fromUrl = decodeGraph(params.get('g'), MAX_GRAPH_N);
  const preset = enumParam('preset', GRAPH_PRESETS.map((p) => p.id), 'square');
  const tape = (params.get('tape') ?? '1101').split('').map(Number);
  return {
    tab: enumParam('tab', TABS, 'lecture'),
    graph: fromUrl ?? makeGraphPreset(preset),
    preset: fromUrl ? 'custom' : preset,
    k: intParam('k', 3, 1, MAX_K),
    omit: (params.get('omit') ?? '').split('.').filter(Boolean),
    size: enumParam('size', SIZES, '9'),
    seed: intParam('seed', 1, 0, 1e9),
    circuit: decodeCircuit(params.get('c'), MAX_WIRES) ?? EXAMPLE_CIRCUIT,
    machine: {
      input: tape.length >= 1 && tape.length <= 6 && tape.every((b) => b === 0 || b === 1) ? tape : [1, 1, 0, 1],
      T: intParam('T', 6, 0, 10),
    },
    lecture: intParam('ls', 0, 0, 20),
    quiz: {},
    bench: {},
    benchRunning: undefined,

    setTab: (tab) => set({ tab, omit: [] }),
    setLecture: (lecture) => set({ lecture }),
    loadPreset: (p) => set({ graph: makeGraphPreset(p), preset: p }),
    setGraph: (graph) => set({ graph, preset: 'custom' }),
    setK: (k) => set({ k }),
    setOmit: (omit) => set({ omit }),
    setPuzzle: (size, seed) => set({ size, seed }),
    setCircuit: (circuit) => set({ circuit }),
    setMachine: (machine) => set({ machine }),
    answer: (q, correct) => set((s) => ({ quiz: { ...s.quiz, [q]: correct } })),
    runCounter: (algoId) => {
      cancel();
      const spec = findAlgorithm(algoId);
      const kind = spec.inputKinds[0]!.id;
      set((s) => ({ benchRunning: algoId, bench: { ...s.bench, [algoId]: [] } }));
      cancel = runBenchmarks(
        [{ algoId, nValues: benchSizes(spec, kind), inputKind: kind, seed: 1 }],
        (p) => set((s) => ({ bench: { ...s.bench, [algoId]: [...(s.bench[algoId] ?? []), p] } })),
        () => set({ benchRunning: undefined }),
      );
    },
  };
});

/** The graph in the URL: its preset's name, or the drawn graph once edited. */
export const graphParam = (s: Pick<ReductionsState, 'graph' | 'preset'>): Record<string, string> =>
  s.preset === 'custom' ? { g: encodeGraph(s.graph) } : { preset: s.preset };
