import { useMemo } from 'react';
import { knapsackBrute } from '../../algorithms/knapsack/brute';
import { knapsackDp } from '../../algorithms/knapsack/dp';
import { scaledInstance } from '../../algorithms/knapsack/input';
import type { KnapsackInput, KnapsackKind, KnapsackResult, KnapsackSnapshot } from '../../algorithms/knapsack/input';
import { replayArray } from '../../algorithms/sort/replay';
import { bestFit } from '../../engine/fit';
import { runTrace } from '../../engine/runner';
import type { TraceStep } from '../../engine/runner';
import {
  AXES,
  KNAPSACK_ALGOS,
  knapsackAlgoId,
  MAX_ANIM_CELLS,
  MAX_BITS,
  MAX_ITEMS,
  MIN_BITS,
  useKnapsackStore,
} from '../../store/knapsack';
import type { KnapsackAlgo } from '../../store/knapsack';
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
import { findAlgorithm } from '../registry';

const META: Record<KnapsackAlgo, { name: string; color: string }> = {
  brute: { name: 'Brute force', color: '#c2417a' },
  dp: { name: 'Dynamic programming', color: '#2e9a6a' },
};
const AXIS_LABEL: Record<KnapsackKind, string> = { items: 'Vary the number of items n', bits: 'Vary the bits of W' };
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

/** DP cells written so far, as a row-major (n+1) × (W+1) grid. */
function replayTable(input: KnapsackInput, steps: TraceStep[], upTo: number): number[] {
  const cols = input.W + 1;
  const t = Array<number>((input.w.length + 1) * cols).fill(-1);
  for (let c = 0; c < cols; c++) t[c] = 0;
  for (const { event: e } of steps.slice(0, upTo)) {
    if (e.op === 'write' && e.indices?.length === 2) t[e.indices[0]! * cols + e.indices[1]!] = e.value as number;
  }
  return t;
}

function BruteDrawing({ input, steps, frame }: { input: KnapsackInput; steps: TraceStep[]; frame: Frame<KnapsackSnapshot> }) {
  const bits = replayArray(Array(input.w.length).fill(0), steps, frame.step);
  const snap = frame.snapshot;
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="array-strip" role="list" aria-label="Current subset">
        {bits.map((b, i) => (
          <div key={i} role="listitem" className={`cell ${b ? 'current' : ''}`} aria-label={`item ${i + 1} ${b ? 'in' : 'out'}`}>
            {b}
          </div>
        ))}
      </div>
      <span className="mono" style={{ fontSize: 13 }}>
        subset weight {snap?.weight ?? 0} / {input.W}, value {snap?.value ?? 0}; best so far {snap?.best ?? 0}
      </span>
    </div>
  );
}

function DpDrawing({ input, steps, frame }: { input: KnapsackInput; steps: TraceStep[]; frame: Frame<KnapsackSnapshot> }) {
  const cols = input.W + 1;
  const rows = input.w.length + 1;
  const t = replayTable(input, steps, frame.step);
  const max = Math.max(1, ...t);
  const { i, c } = frame.snapshot ?? {};
  const cell = Math.max(4, Math.min(18, Math.floor(560 / cols)));
  return (
    <div className="stack" style={{ gap: 6 }}>
      <svg
        viewBox={`0 0 ${cols * cell} ${rows * cell}`}
        className="tree-svg"
        style={{ maxHeight: 240 }}
        role="img"
        aria-label={`DP table, ${rows} rows by ${cols} columns`}
      >
        {t.map((v, k) => {
          const r = Math.floor(k / cols);
          const col = k % cols;
          const now = r === i && col === c;
          return (
            <rect
              key={k}
              x={col * cell}
              y={r * cell}
              width={cell - 1}
              height={cell - 1}
              className={now ? 'dp-now' : v < 0 ? 'dp-empty' : 'dp-cell'}
              style={v >= 0 && !now ? { fillOpacity: 0.15 + (0.85 * v) / max } : undefined}
            />
          );
        })}
      </svg>
      <span className="mono" style={{ fontSize: 13 }}>
        row i = items considered, column c = capacity; {i !== undefined ? `filling (${i}, ${c})` : 'row 0 is all zeros'}
      </span>
    </div>
  );
}

export default function KnapsackModule() {
  const { n, bits, seed, step, axis, predictions, bench, benchRunning } = useKnapsackStore();
  const { configure, setStep, setAxis, predict, runBench } = useKnapsackStore.getState();
  useUrlParams('knapsack', { n, b: bits, seed, step, axis });

  const input = useMemo(() => scaledInstance(n, bits, seed), [n, bits, seed]);
  const cells = (n + 1) * (input.W + 1);
  const animDp = cells <= MAX_ANIM_CELLS;
  const traces = useMemo(
    () =>
      KNAPSACK_ALGOS.filter((a) => a === 'brute' || animDp).map((a) => ({
        a,
        trace: runTrace(a === 'brute' ? knapsackBrute : knapsackDp, input),
      })),
    [input, animDp],
  );
  const brute = useSolve<KnapsackResult>(knapsackAlgoId('brute'), input);
  const dp = useSolve<KnapsackResult>(knapsackAlgoId('dp'), input);

  const maxStep = Math.max(...traces.map((t) => t.trace.steps.length));
  const s = Math.min(step, maxStep);

  const kind = findAlgorithm(knapsackAlgoId('dp')).inputKinds.find((k) => k.id === axis)!;
  const series: ScalingSeries[] = KNAPSACK_ALGOS.flatMap((a) => {
    const pts = (bench[a] ?? []).filter((p) => !p.truncated).map((p) => ({ n: p.n, ops: p.ops }));
    if (pts.length === 0) return [];
    const fit = !benchRunning && pts.length >= 3 ? bestFit(pts.map((p) => ({ n: p.n, y: p.ops }))) : undefined;
    return [{ label: META[a].name, color: META[a].color, points: pts, fit }];
  });
  const domain = useMemo<[number, number]>(
    () => [1, Math.max(...KNAPSACK_ALGOS.flatMap((a) => (bench[a] ?? []).map((p) => p.n)), axis === 'bits' ? 18 : 64)],
    [bench, axis],
  );

  const result = (label: string, r: typeof brute, testid: string) => (
    <tr>
      <th scope="row">{label}</th>
      <td className="mono" data-testid={`${testid}-ops`}>
        {r.status === 'done' ? fmt(r.ops) : '…'}
      </td>
      <td className="mono" data-testid={`${testid}-cells`}>
        {r.status === 'done' ? fmt(r.peakMem) : '…'}
      </td>
      <td className="mono">{r.status === 'done' ? (r.truncated ? 'stopped at budget' : r.result?.best) : '…'}</td>
    </tr>
  );

  return (
    <div className="stack">
      <section className="panel controls" aria-label="Instance">
        <label>
          Items n = <span className="mono">{n}</span>
          <input
            type="range"
            min={1}
            max={MAX_ITEMS}
            value={n}
            onChange={(e) => configure({ n: Number(e.target.value) })}
            aria-label="Number of items"
          />
        </label>
        <span>
          Capacity W = <strong className="mono" data-testid="capacity">{fmt(input.W)}</strong>{' '}
          <span className="muted">({bits} bits)</span>
        </span>
        <button onClick={() => configure({ bits: bits - 1 })} disabled={bits <= MIN_BITS}>
          Remove a bit
        </button>
        <button className="primary" onClick={() => configure({ bits: bits + 1 })} disabled={bits >= MAX_BITS}>
          Add a bit
        </button>
        <label>
          Seed
          <input type="number" value={seed} min={0} onChange={(e) => configure({ seed: Number(e.target.value) || 0 })} style={{ width: 80 }} />
        </label>
      </section>

      <section className="panel" aria-label="Items">
        <div className="table-scroll">
          <table className="level-sums">
            <thead>
              <tr>
                <th scope="col">Item</th>
                {input.w.map((_, i) => (
                  <th key={i} scope="col">
                    {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Weight</th>
                {input.w.map((w, i) => (
                  <td key={i} className="mono">
                    {fmt(w)}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">Value</th>
                {input.v.map((v, i) => (
                  <td key={i} className="mono">
                    {v}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid-2">
        <RaceView<KnapsackSnapshot>
          step={s}
          metric="total"
          metricLabel="ops"
          entries={traces.map(({ a, trace }) => ({
            key: a,
            name: META[a].name,
            color: META[a].color,
            trace,
            render: (f) =>
              a === 'brute' ? (
                <BruteDrawing input={input} steps={trace.steps} frame={f} />
              ) : (
                <DpDrawing input={input} steps={trace.steps} frame={f} />
              ),
          }))}
        />
        <div className="stack top">
          <section className="panel stack" aria-label="Full run">
            <h2>Full run</h2>
            <table className="level-sums">
              <thead>
                <tr>
                  <th scope="col" />
                  <th scope="col">ops</th>
                  <th scope="col">cells</th>
                  <th scope="col">best value</th>
                </tr>
              </thead>
              <tbody>
                {result('Brute force', brute, 'brute')}
                {result('DP', dp, 'dp')}
              </tbody>
            </table>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Brute force tries all 2<sup>{n}</sup> = {fmt(2 ** n)} subsets whatever W is. The DP fills (n + 1)(W + 1) ={' '}
              {fmt(cells)} cells: each added bit doubles W, and the table with it.
              {!animDp && ' The table is too large to animate; the full run happens in the background.'}
            </p>
          </section>
          <MemoryView rows={traces.map(({ a, trace }) => ({ label: META[a].name, counters: frameAt(trace, s).counters }))} />
        </div>
      </div>

      <Timeline step={s} maxStep={maxStep} onStep={(v) => setStep(Math.min(v, maxStep))} />

      <section className="panel emphasis stack" aria-label="Scaling">
        <h2>Scaling: polynomial in what?</h2>
        <div className="controls">
          <label>
            Experiment
            <select aria-label="Scaling axis" value={axis} onChange={(e) => setAxis(e.target.value as KnapsackKind)}>
              {AXES.map((a) => (
                <option key={a} value={a}>
                  {AXIS_LABEL[a]}
                </option>
              ))}
            </select>
          </label>
          <button className="primary" onClick={runBench} disabled={benchRunning}>
            {benchRunning ? 'Running…' : 'Run scaling experiment'}
          </button>
        </div>
        {KNAPSACK_ALGOS.map((a) => (
          <PredictWidget
            key={`${a}-${axis}`}
            algorithm={`${META[a].name} (${kind.xLabel ?? 'items n'})`}
            value={predictions[a]}
            onChange={(c) => predict(a, c)}
            measured={series.find((x) => x.label === META[a].name)?.fit?.cls}
            disabled={benchRunning}
          />
        ))}
        <ScalingView series={series} domain={domain} xLabel={kind.xLabel ?? 'items n'} initialLogY />
        <p className="muted" style={{ margin: 0 }}>
          With W = 8n the DP is O(n · W) = O(n²): it looks polynomial. But the input only needs b = log₂ W bits to
          write W down, and n·W = n·2ᵇ is exponential in b. That is what pseudo-polynomial means: polynomial in the
          value of W, exponential in its length. Brute force is the opposite: 2ⁿ in the items, untouched by W.
        </p>
      </section>
    </div>
  );
}
