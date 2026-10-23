import { useMemo } from 'react';
import { binarySearch } from '../../algorithms/search/binary';
import { makeSearchInput, SEARCH_INPUT_KINDS } from '../../algorithms/search/input';
import type { SearchInputKind, SearchSnapshot } from '../../algorithms/search/input';
import { interpolationSearch } from '../../algorithms/search/interpolation';
import { jumpSearch } from '../../algorithms/search/jump';
import { linearSearch } from '../../algorithms/search/linear';
import { bestFit } from '../../engine/fit';
import { mulberry32 } from '../../engine/rng';
import { runTrace } from '../../engine/runner';
import { BENCH_N, MAX_ANIM_N, SEARCH_MODES, modeAlgos, useSearchStore } from '../../store/search';
import type { SearchAlgo, SearchMode } from '../../store/search';
import { useUrlParams } from '../../store/url-state';
import { MemoryView } from '../../views/MemoryView';
import { PredictWidget } from '../../views/PredictWidget';
import { RaceView } from '../../views/RaceView';
import { ScalingView } from '../../views/ScalingView';
import type { ScalingSeries } from '../../views/ScalingView';
import { Timeline } from '../../views/Timeline';
import { frameAt } from '../../views/trace-frames';
import { ArrayStrip } from './ArrayStrip';
import { GuessGame } from './GuessGame';

const META: Record<SearchAlgo, { name: string; color: string; generator: typeof linearSearch }> = {
  linear: { name: 'Linear search', color: '#e08a2e', generator: linearSearch },
  binary: { name: 'Binary search', color: '#4c78e0', generator: binarySearch },
  jump: { name: 'Jump search', color: '#7d5ba6', generator: jumpSearch },
  interpolation: { name: 'Interpolation search', color: '#2e9a6a', generator: interpolationSearch },
};
const MODE_LABEL: Record<SearchMode, string> = {
  linear: 'Linear search',
  binary: 'Binary search',
  jump: 'Jump search',
  interpolation: 'Interpolation search',
  race: 'Race all four',
};

export default function SearchModule() {
  const { mode, n, kind, seed, step, predictions, bench, benchRunning } = useSearchStore();
  const { configure, setStep, predict, runBench } = useSearchStore.getState();
  useUrlParams('search', { algo: mode, n, kind, seed, step });

  const algos = modeAlgos(mode);
  const input = useMemo(() => makeSearchInput(n, kind, mulberry32(seed)), [n, kind, seed]);
  const traces = useMemo(
    () => algos.map((a) => ({ a, trace: runTrace(META[a].generator, input) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- algos is derived from mode
    [mode, input],
  );
  const maxStep = Math.max(...traces.map((t) => t.trace.steps.length));
  const s = Math.min(step, maxStep);

  const frames = traces.map(({ a, trace }) => ({ a, ...frameAt<SearchSnapshot>(trace, s) }));

  const series: ScalingSeries[] = algos.flatMap((a) => {
    const pts = (bench[a] ?? []).filter((p) => !p.truncated).map((p) => ({ n: p.n, ops: p.ops }));
    if (pts.length === 0) return [];
    const done = !benchRunning && pts.length >= 3;
    return [{ label: META[a].name, color: META[a].color, points: pts, fit: done ? bestFit(pts.map((p) => ({ n: p.n, y: p.ops }))) : undefined }];
  });
  const markers = frames.map((f) => ({ label: META[f.a].name, color: META[f.a].color, n, ops: f.counters.totalOps }));
  const domain = useMemo<[number, number]>(() => [1, BENCH_N.at(-1)!], []);

  return (
    <div className="stack">
      <section className="panel controls" aria-label="Configuration">
        <label>
          Algorithm
          <select value={mode} onChange={(e) => configure({ mode: e.target.value as SearchMode })}>
            {SEARCH_MODES.map((m) => (
              <option key={m} value={m}>
                {MODE_LABEL[m]}
              </option>
            ))}
          </select>
        </label>
        <label>
          n = <span className="mono">{n}</span>
          <input
            type="range"
            min={1}
            max={MAX_ANIM_N}
            value={n}
            onChange={(e) => configure({ n: Number(e.target.value) })}
            aria-label="Input size n"
          />
        </label>
        <label>
          Input
          <select value={kind} onChange={(e) => configure({ kind: e.target.value as SearchInputKind })}>
            {SEARCH_INPUT_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        {SEARCH_INPUT_KINDS.find((k) => k.id === kind)?.random && (
          <label>
            Seed
            <input
              type="number"
              value={seed}
              min={0}
              onChange={(e) => configure({ seed: Number(e.target.value) || 0 })}
              style={{ width: 80 }}
            />
          </label>
        )}
      </section>

      <div className="grid-2">
        <RaceView<SearchSnapshot>
          step={s}
          metric="compare"
          metricLabel="compares"
          entries={traces.map(({ a, trace }) => ({
            key: a,
            name: META[a].name,
            color: META[a].color,
            trace,
            render: (f) => <ArrayStrip input={input} snap={f.snapshot} />,
          }))}
        />
        <MemoryView rows={frames.map((f) => ({ label: META[f.a].name, counters: f.counters }))} />
      </div>

      <Timeline step={s} maxStep={maxStep} onStep={(v) => setStep(Math.min(v, maxStep))} />

      <section className="panel emphasis stack" aria-label="Scaling">
        <h2>Scaling: n from 16 to {BENCH_N.at(-1)!.toLocaleString()}</h2>
        {algos.map((a) => (
          <PredictWidget
            key={a}
            algorithm={META[a].name}
            value={predictions[a]}
            onChange={(c) => predict(a, c)}
            measured={series.find((x) => x.label === META[a].name)?.fit?.cls}
            disabled={benchRunning}
          />
        ))}
        <div>
          <button className="primary" onClick={runBench} disabled={benchRunning}>
            {benchRunning ? 'Running…' : 'Run scaling experiment'}
          </button>
        </div>
        <ScalingView series={series} markers={markers} domain={domain} />
        <p className="muted" style={{ margin: 0 }}>
          Jump search checks every √n-th element and then scans one block: O(√n), between linear and binary.
          Interpolation search guesses where the target should be from the values at the ends: about log log n probes
          when values are evenly spread, but on the skewed array every guess lands one place along and it is as slow as
          linear search. Try the same algorithm on different inputs.
        </p>
      </section>

      <GuessGame />
    </div>
  );
}
