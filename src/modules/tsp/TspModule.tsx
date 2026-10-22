import { useMemo, useState } from 'react';
import { replayArray } from '../../algorithms/sort/replay';
import { tspBrute } from '../../algorithms/tsp/brute';
import { tspHeldKarp } from '../../algorithms/tsp/held-karp';
import { tspHeuristic } from '../../algorithms/tsp/heuristic';
import type { TspInput, TspResult, TspSnapshot } from '../../algorithms/tsp/input';
import { growth, lnFactorial } from '../../engine/complexity';
import { bestFit } from '../../engine/fit';
import { runTrace } from '../../engine/runner';
import type { Algorithm, TraceResult } from '../../engine/runner';
import { EXACT_CAP, encodeCities, MAX_CITIES, TSP_ALGOS, tspAlgoId, useTspStore } from '../../store/tsp';
import type { TspAlgo } from '../../store/tsp';
import { useUrlParams } from '../../store/url-state';
import { MemoryView } from '../../views/MemoryView';
import { PredictWidget } from '../../views/PredictWidget';
import { RaceView } from '../../views/RaceView';
import { ScalingView } from '../../views/ScalingView';
import type { ScalingSeries } from '../../views/ScalingView';
import { Timeline } from '../../views/Timeline';
import { frameAt } from '../../views/trace-frames';
import type { Frame } from '../../views/trace-frames';
import { useSolve } from '../../views/useSolve';
import type { Solve } from '../../views/useSolve';
import { CityMap } from './CityMap';

const META: Record<TspAlgo, { name: string; color: string; generator: Algorithm<TspInput, TspResult> }> = {
  brute: { name: 'Brute force', color: '#c2417a', generator: tspBrute },
  'held-karp': { name: 'Held–Karp', color: '#4c78e0', generator: tspHeldKarp },
  heuristic: { name: 'Nearest neighbour + 2-opt', color: '#2e9a6a', generator: tspHeuristic },
};

const OPS_PER_SECOND = 1e9;

/** log10 of the ops an exact algorithm would need on n cities. */
const log10Ops = (a: TspAlgo, n: number) =>
  a === 'brute' ? lnFactorial(n) / Math.LN10 : Math.log10(growth('n2exp2', n));

function formatDuration(log10Seconds: number): string {
  const s = 10 ** log10Seconds;
  if (log10Seconds < 0) return 'under a second';
  if (s < 120) return `${Math.round(s)} seconds`;
  if (s < 7200) return `${Math.round(s / 60)} minutes`;
  if (s < 2 * 86_400) return `${Math.round(s / 3600)} hours`;
  if (s < 2 * 31_557_600) return `${Math.round(s / 86_400)} days`;
  const years = log10Seconds - Math.log10(31_557_600);
  return years < 6 ? `${Math.round(10 ** years).toLocaleString('en-US')} years` : `≈ 10^${Math.floor(years)} years`;
}

const fmt = (x: number) => Math.round(x).toLocaleString('en-US');

function Drawing({ a, trace, frame, input }: { a: TspAlgo; trace: TraceResult<unknown>; frame: Frame<TspSnapshot>; input: TspInput }) {
  const n = input.pts.length;
  const snap = frame.snapshot;
  const finished = frame.step >= trace.steps.length && !trace.truncated;
  const tours = [];
  if (a === 'held-karp') {
    if (finished) tours.push({ tour: (trace.result as TspResult).tour, color: META[a].color });
  } else {
    const initial = a === 'brute' ? Array.from({ length: n }, (_, i) => i) : Array(n).fill(-1);
    tours.push({ tour: replayArray(initial, trace.steps, frame.step), color: META[a].color });
    if (snap?.bestTour && a === 'brute') tours.push({ tour: snap.bestTour, color: 'currentColor', dashed: true });
  }
  const lit =
    a === 'held-karp' && snap?.mask !== undefined && !finished
      ? new Set(Array.from({ length: n - 1 }, (_, j) => j + 1).filter((c) => snap.mask! & (1 << (c - 1))))
      : undefined;
  return (
    <div className="stack" style={{ gap: 6 }}>
      <CityMap cities={input.pts} label={`${META[a].name} tour`} tours={tours} lit={lit} />
      <span className="mono" style={{ fontSize: 13 }}>
        {a === 'brute' && snap?.best !== undefined && `best tour so far ${fmt(snap.best)} (dashed)`}
        {a === 'held-karp' &&
          (finished ? 'shortest tour' : snap?.last !== undefined ? `paths through the lit cities, ending at ${snap.last}` : '')}
        {trace.truncated && ' · the animation shows the first 10,000 steps'}
      </span>
    </div>
  );
}

export default function TspModule() {
  const { cities, preset, step, predictions, bench, benchRunning } = useTspStore();
  const { loadPreset, addCity, clear, setStep, predict, runBench } = useTspStore.getState();
  useUrlParams('tsp', { ...(preset ? { k: preset.k, seed: preset.seed } : { c: encodeCities(cities) }), step });
  const [k, setK] = useState(preset?.k ?? 8);
  const [seed, setSeed] = useState(preset?.seed ?? 1);

  const n = cities.length;
  const input = useMemo<TspInput>(() => ({ pts: cities }), [cities]);
  const exact = (a: TspAlgo) => n <= EXACT_CAP[a];
  const runnable = TSP_ALGOS.filter(exact);
  const traces = useMemo(
    () => (n < 2 ? [] : runnable.map((a) => ({ a, trace: runTrace(META[a].generator, input) }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runnable is derived from n
    [input, n],
  );
  const solves: Record<TspAlgo, Solve<TspResult>> = {
    brute: useSolve<TspResult>(tspAlgoId('brute'), exact('brute') && n >= 2 ? input : undefined),
    'held-karp': useSolve<TspResult>(tspAlgoId('held-karp'), exact('held-karp') && n >= 2 ? input : undefined),
    heuristic: useSolve<TspResult>(tspAlgoId('heuristic'), n >= 2 ? input : undefined),
  };
  const opt = solves['held-karp'].status === 'done' && !solves['held-karp'].truncated ? solves['held-karp'].result?.cost : undefined;

  const maxStep = Math.max(0, ...traces.map((t) => t.trace.steps.length));
  const s = Math.min(step, maxStep);

  const series: ScalingSeries[] = TSP_ALGOS.flatMap((a) => {
    const pts = (bench[a] ?? []).filter((p) => !p.truncated).map((p) => ({ n: p.n, ops: p.ops }));
    if (pts.length === 0) return [];
    const fit = !benchRunning && pts.length >= 3 ? bestFit(pts.map((p) => ({ n: p.n, y: p.ops }))) : undefined;
    return [{ label: META[a].name, color: META[a].color, points: pts, fit }];
  });
  const domain = useMemo<[number, number]>(() => [2, 512], []);

  return (
    <div className="stack">
      <section className="panel stack" aria-label="Cities">
        <h2>Cities</h2>
        <div className="controls">
          <label>
            Random cities
            <input type="number" min={2} max={MAX_CITIES} value={k} onChange={(e) => setK(Math.max(2, Math.min(MAX_CITIES, Number(e.target.value) || 2)))} style={{ width: 60 }} aria-label="Number of random cities" />
          </label>
          <label>
            Seed
            <input type="number" min={0} value={seed} onChange={(e) => setSeed(Number(e.target.value) || 0)} style={{ width: 70 }} />
          </label>
          <button onClick={() => loadPreset(k, seed)}>Scatter</button>
          <button onClick={clear}>Clear</button>
          <span className="muted" data-testid="city-count">
            {n} cities
          </span>
        </div>
        <CityMap cities={cities} label={`Map with ${n} cities`} onAdd={addCity} tours={[]} />
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Click the map to add a city (up to {MAX_CITIES}). Every tour starts and ends at city 0 (filled).
        </p>
      </section>

      <section className="panel stack" aria-label="Results">
        <h2>Results on this map</h2>
        <div className="table-scroll">
          <table className="level-sums">
            <thead>
              <tr>
                <th scope="col">Algorithm</th>
                <th scope="col">Tour length</th>
                <th scope="col">ops</th>
                <th scope="col">Optimality gap</th>
              </tr>
            </thead>
            <tbody>
              {TSP_ALGOS.map((a) => {
                const r = solves[a];
                const done = r.status === 'done' && !r.truncated ? r : undefined;
                const gap = done?.result && opt !== undefined ? done.result.cost / opt - 1 : undefined;
                return (
                  <tr key={a}>
                    <th scope="row">
                      <span style={{ color: META[a].color }}>●</span> {META[a].name}
                    </th>
                    {!exact(a) ? (
                      <td colSpan={3} className="muted" data-testid={`estimate-${a}`}>
                        not run: about 10^{Math.floor(log10Ops(a, n))} ops, {formatDuration(log10Ops(a, n) - Math.log10(OPS_PER_SECOND))} at 10⁹ ops/s
                      </td>
                    ) : (
                      <>
                        <td className="mono" data-testid={`cost-${a}`}>
                          {done?.result ? done.result.cost.toFixed(1) : r.status === 'done' ? 'stopped at budget' : '…'}
                        </td>
                        <td className="mono">{done ? fmt(done.ops) : '…'}</td>
                        <td className="mono" data-testid={`gap-${a}`}>
                          {gap !== undefined ? `${(gap * 100).toFixed(1)}%` : opt === undefined && n > EXACT_CAP['held-karp'] ? 'unknown' : '…'}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!exact('held-karp') && (
          <p className="muted" style={{ margin: 0 }}>
            With {n} cities no exact answer is available, so the heuristic&apos;s gap is unknown: that is the price of a
            fast answer.
          </p>
        )}
      </section>

      {traces.length > 0 && (
        <>
          <div className="grid-2">
            <RaceView<TspSnapshot>
              step={s}
              metric="total"
              metricLabel="ops"
              entries={traces.map(({ a, trace }) => ({
                key: a,
                name: META[a].name,
                color: META[a].color,
                trace,
                render: (f) => <Drawing a={a} trace={trace} frame={f} input={input} />,
              }))}
            />
            <MemoryView rows={traces.map(({ a, trace }) => ({ label: META[a].name, counters: frameAt(trace, s).counters }))} />
          </div>
          <Timeline step={s} maxStep={maxStep} onStep={(v) => setStep(Math.min(v, maxStep))} />
        </>
      )}

      <section className="panel emphasis stack" aria-label="Scaling">
        <h2>Scaling: the factorial wall</h2>
        {TSP_ALGOS.map((a) => (
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
        <ScalingView series={series} domain={domain} xLabel="cities n" initialLogY />
        <p className="muted" style={{ margin: 0 }}>
          Brute force checks (n − 1)! tours. Held–Karp reuses shortest paths through each subset of cities: n²·2ⁿ is
          still exponential, but it reaches 16 cities where brute force stops at 10. The heuristic is polynomial and
          handles hundreds of cities, but it carries no guarantee of being optimal.
        </p>
      </section>
    </div>
  );
}
