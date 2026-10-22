import { create } from 'zustand';
import { decodeCnf, makePreset, PRESETS } from '../algorithms/sat/cnf';
import type { Cnf, PresetId } from '../algorithms/sat/cnf';
import type { Heuristic } from '../algorithms/sat/input';
import { runBenchmarks, runSweeps } from '../engine/benchmark';
import type { BenchmarkPoint, SweepPoint } from '../engine/benchmark-core';
import { mulberry32 } from '../engine/rng';
import { benchSizes, findAlgorithm } from '../modules/registry';
import { enumParam, intParam } from './url-state';

export const TABS = ['lecture', 'workspace', 'experiments'] as const;
export type Tab = (typeof TABS)[number];
export const HEURISTICS = ['first', 'moms', 'jw'] as const satisfies readonly Heuristic[];
export const SAT_ALGOS = ['truth-table', 'backtracking', 'dpll-first', 'dpll-moms', 'dpll-jw'] as const;
export type SatAlgo = (typeof SAT_ALGOS)[number];
export const SHOOTOUT = ['dpll-first', 'dpll-moms', 'dpll-jw'] as const satisfies readonly SatAlgo[];
export const satAlgoId = (a: SatAlgo) => `sat/${a}`;

export const MAX_VARS = 20;
/** Phase transition: n = 40, where the hardness peak stands out from small-n noise. */
export const PHASE_N = 40;
export const PHASE_RATIOS = Array.from({ length: 21 }, (_, i) => 2 + 0.25 * i);
export const SHOOTOUT_N = 50;
const TRIALS = 64;
const PHASE_WORKERS = 4;

interface SatState {
  tab: Tab;
  cnf: Cnf;
  /** The preset the formula came from, until the student edits it. */
  preset: PresetId | 'custom';
  seed: number;
  heuristic: Heuristic;
  propagate: boolean;
  pure: boolean;
  step: number;
  lecture: number;
  bench: Partial<Record<SatAlgo, BenchmarkPoint[]>>;
  phase: SweepPoint[];
  shootout: Partial<Record<SatAlgo, SweepPoint>>;
  running: { scaling: boolean; phase: boolean; shootout: boolean };
  setTab: (t: Tab) => void;
  setLecture: (i: number) => void;
  loadPreset: (id: PresetId, seed?: number) => void;
  setCnf: (cnf: Cnf) => void;
  configure: (c: Partial<Pick<SatState, 'heuristic' | 'propagate' | 'pure'>>) => void;
  setStep: (s: number) => void;
  runScaling: () => void;
  runPhase: () => void;
  runShootout: () => void;
}

export const useSatStore = create<SatState>()((set) => {
  const cancel = { scaling: () => {}, phase: () => {}, shootout: () => {} };
  const params = new URLSearchParams(location.search);
  const fromUrl = decodeCnf(params.get('f'), MAX_VARS);
  const preset = enumParam('preset', PRESETS.map((p) => p.id), 'example');
  const seed = intParam('seed', 1, 0, 1e9);
  const flag = (key: string, def: boolean) => (params.has(key) ? params.get(key) === '1' : def);
  return {
    tab: enumParam('tab', TABS, 'lecture'),
    cnf: fromUrl ?? makePreset(preset, mulberry32(seed)),
    preset: fromUrl ? 'custom' : preset,
    seed,
    heuristic: enumParam('h', HEURISTICS, 'first'),
    propagate: flag('up', true),
    pure: flag('pl', false),
    step: intParam('step', 0, 0, 1e6),
    lecture: intParam('ls', 0, 0, 20),
    bench: {},
    phase: [],
    shootout: {},
    running: { scaling: false, phase: false, shootout: false },

    setTab: (tab) => set({ tab, step: 0 }),
    setLecture: (lecture) => set({ lecture }),
    loadPreset: (id, s) => set((st) => ({ cnf: makePreset(id, mulberry32(s ?? st.seed)), preset: id, seed: s ?? st.seed, step: 0 })),
    setCnf: (cnf) => set({ cnf, preset: 'custom', step: 0 }),
    configure: (c) => set({ ...c, step: 0 }),
    setStep: (step) => set({ step: Math.max(0, step) }),

    runScaling: () => {
      cancel.scaling();
      set((s) => ({ bench: {}, running: { ...s.running, scaling: true } }));
      const byId = Object.fromEntries(SAT_ALGOS.map((a) => [satAlgoId(a), a])) as Record<string, SatAlgo>;
      cancel.scaling = runBenchmarks(
        SAT_ALGOS.map((a) => {
          const spec = findAlgorithm(satAlgoId(a));
          const kind = spec.inputKinds[0]!.id;
          return { algoId: spec.id, nValues: benchSizes(spec, kind), inputKind: kind, seed: 1 };
        }),
        (p) => {
          const a = byId[p.algoId]!;
          set((s) => ({ bench: { ...s.bench, [a]: [...(s.bench[a] ?? []), p] } }));
        },
        () => set((s) => ({ running: { ...s.running, scaling: false } })),
      );
    },
    runPhase: () => {
      cancel.phase();
      set((s) => ({ phase: [], running: { ...s.running, phase: true } }));
      // Ratios dealt out to a few workers, so the sweep fills in in parallel.
      const chunks = Array.from({ length: PHASE_WORKERS }, (_, w) => PHASE_RATIOS.filter((_, i) => i % PHASE_WORKERS === w));
      cancel.phase = runSweeps(
        chunks.map((params) => ({ algoId: satAlgoId('dpll-jw'), n: PHASE_N, inputKind: 'threshold', params, trials: TRIALS, seed: 1 })),
        (p) => set((s) => ({ phase: [...s.phase, p].sort((a, b) => a.param - b.param) })),
        () => set((s) => ({ running: { ...s.running, phase: false } })),
      );
    },
    runShootout: () => {
      cancel.shootout();
      set((s) => ({ shootout: {}, running: { ...s.running, shootout: true } }));
      const byId = Object.fromEntries(SHOOTOUT.map((a) => [satAlgoId(a), a])) as Record<string, SatAlgo>;
      // The same seed gives every heuristic the same formulas.
      cancel.shootout = runSweeps(
        SHOOTOUT.map((a) => ({ algoId: satAlgoId(a), n: SHOOTOUT_N, inputKind: 'threshold', params: [4.26], trials: TRIALS, seed: 7 })),
        (p) => set((s) => ({ shootout: { ...s.shootout, [byId[p.algoId]!]: p } })),
        () => set((s) => ({ running: { ...s.running, shootout: false } })),
      );
    },
  };
});
