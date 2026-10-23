import { useMemo } from 'react';
import { makeSortInput } from '../../algorithms/sort/input';
import type { SortSnapshot } from '../../algorithms/sort/input';
import { replayArray } from '../../algorithms/sort/replay';
import { bestFit } from '../../engine/fit';
import { mulberry32 } from '../../engine/rng';
import { runTrace } from '../../engine/runner';
import { algoId, SORT_ALGOS, useSortingStore } from '../../store/sorting';
import { MemoryView } from '../../views/MemoryView';
import { PredictWidget } from '../../views/PredictWidget';
import { RaceView } from '../../views/RaceView';
import { ScalingView } from '../../views/ScalingView';
import type { ScalingSeries } from '../../views/ScalingView';
import { Timeline } from '../../views/Timeline';
import { frameAt } from '../../views/trace-frames';
import { findAlgorithm } from '../registry';
import { BarsView } from './BarsView';
import { SORT_META } from './meta';

export function ExploreTab() {
  const { algos, n, preset, seed, step, predictions, bench, benchRunning } = useSortingStore();
  const { toggleAlgo, selectAll, setStep, predict, runBench } = useSortingStore.getState();

  const input = useMemo(() => makeSortInput(n, preset, mulberry32(seed)), [n, preset, seed]);
  const traces = useMemo(() => algos.map((a) => ({ a, trace: runTrace(SORT_META[a].generator, input) })), [algos, input]);
  // Sorts added since the last scaling run have no curve yet.
  const unmeasured = algos.filter((a) => !bench[a]?.length);
  const maxStep = Math.max(...traces.map((t) => t.trace.steps.length));
  const s = Math.min(step, maxStep);
  const frames = traces.map(({ a, trace }) => ({ a, ...frameAt(trace, s) }));

  const series: ScalingSeries[] = algos.flatMap((a) => {
    const pts = (bench[a] ?? []).filter((p) => !p.truncated).map((p) => ({ n: p.n, ops: p.ops }));
    if (pts.length === 0) return [];
    const fit = !benchRunning && pts.length >= 3 ? bestFit(pts.map((p) => ({ n: p.n, y: p.ops }))) : undefined;
    return [{ label: SORT_META[a].name, color: SORT_META[a].color, points: pts, fit }];
  });
  const markers = frames.map((f) => ({ label: SORT_META[f.a].name, color: SORT_META[f.a].color, n, ops: f.counters.ops.compare }));
  const maxBench = Math.max(...algos.map((a) => findAlgorithm(algoId(a)).maxBenchN));
  const domain = useMemo<[number, number]>(() => [1, maxBench], [maxBench]);

  return (
    <div className="stack">
      <section className="panel stack" aria-label="Algorithms">
        <div className="controls" role="group" aria-label="Sorts to compare">
          <span>Compare</span>
          {SORT_ALGOS.map((a) => {
            const on = algos.includes(a);
            const last = on && algos.length === 1;
            return (
              <button
                key={a}
                className="algo-chip"
                aria-pressed={on}
                aria-disabled={last}
                title={last ? 'At least one sort stays selected' : undefined}
                onClick={() => toggleAlgo(a)}
              >
                <span style={{ color: SORT_META[a].color }}>●</span> {SORT_META[a].name}
              </button>
            );
          })}
          <button onClick={selectAll} disabled={algos.length === SORT_ALGOS.length}>
            All
          </button>
        </div>
        <span className="muted" style={{ fontSize: 13 }}>
          Every selected sort runs on the same input: they race on the timeline and share the scaling plot.
        </span>
      </section>

      <div className="grid-2">
        <RaceView<SortSnapshot>
          step={s}
          metric="compare"
          metricLabel="compares"
          entries={traces.map(({ a, trace }) => ({
            key: a,
            name: SORT_META[a].name,
            color: SORT_META[a].color,
            trace,
            render: (f) => <BarsView arr={replayArray(input.arr, trace.steps, f.step)} event={f.event} snap={f.snapshot} />,
          }))}
        />
        <MemoryView rows={frames.map((f) => ({ label: SORT_META[f.a].name, counters: f.counters }))} />
      </div>

      <Timeline step={s} maxStep={maxStep} onStep={(v) => setStep(Math.min(v, maxStep))} />

      <section className="panel emphasis stack" aria-label="Scaling">
        <h2>Scaling: comparisons as n grows</h2>
        {algos.map((a) => (
          <PredictWidget
            key={a}
            algorithm={SORT_META[a].name}
            value={predictions[a]}
            onChange={(c) => predict(a, c)}
            measured={series.find((x) => x.label === SORT_META[a].name)?.fit?.cls}
            disabled={benchRunning}
          />
        ))}
        <div>
          <button className="primary" onClick={runBench} disabled={benchRunning}>
            {benchRunning ? 'Running…' : 'Run scaling experiment'}
          </button>
        </div>
        {unmeasured.length > 0 && Object.values(bench).some((b) => b?.length) && !benchRunning && (
          <p className="muted" style={{ margin: 0 }}>
            Run again to add {unmeasured.map((a) => SORT_META[a].name).join(', ')} to the plot.
          </p>
        )}
        <ScalingView series={series} markers={markers} domain={domain} initialLogY={algos.length > 2} />
      </section>
    </div>
  );
}
