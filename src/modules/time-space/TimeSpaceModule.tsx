import { useMemo } from 'react';
import { fibIterative } from '../../algorithms/fib/iterative';
import type { FibInput, FibSnapshot } from '../../algorithms/fib/input';
import { fibMemo, fibNaive } from '../../algorithms/fib/recursive';
import { buildCallTree } from '../../engine/calltree';
import { bestFit } from '../../engine/fit';
import { runTrace } from '../../engine/runner';
import type { Algorithm, TraceStep } from '../../engine/runner';
import { FIB_ALGOS, maxN, useTimeSpaceStore } from '../../store/time-space';
import type { FibAlgo } from '../../store/time-space';
import { useUrlParams } from '../../store/url-state';
import { AlgorithmView } from '../../views/AlgorithmView';
import { CallTreeView } from '../../views/CallTreeView';
import { MemoryView } from '../../views/MemoryView';
import { PredictWidget } from '../../views/PredictWidget';
import { ScalingView } from '../../views/ScalingView';
import type { ScalingSeries } from '../../views/ScalingView';
import { Timeline } from '../../views/Timeline';
import { frameAt } from '../../views/trace-frames';

const META: Record<FibAlgo, { name: string; color: string; generator: Algorithm<FibInput, bigint> }> = {
  naive: { name: 'Naive recursion', color: '#c2417a', generator: fibNaive },
  memo: { name: 'Memoised recursion', color: '#2e9a6a', generator: fibMemo },
  iterative: { name: 'Iterative', color: '#4c78e0', generator: fibIterative },
};

const DOMAIN: [number, number] = [1, 40];

/** Memo-table cells written so far: index k holds fib(k) once computed. */
function memoTable(n: number, steps: TraceStep[], upTo: number): (string | undefined)[] {
  const table: (string | undefined)[] = Array<string | undefined>(n + 1).fill(undefined);
  for (const { event: e } of steps.slice(0, upTo)) {
    if (e.op === 'write' && e.indices?.length === 1) table[e.indices[0]!] = e.value as string;
  }
  return table;
}

/** The two cells of the iterative version: (fib(k−1), fib(k)) after the last write. */
function lastTwo(steps: TraceStep[], upTo: number): [string, string] {
  let pair: [string, string] = ['0', '1'];
  for (const { event: e } of steps.slice(0, upTo)) if (e.op === 'write') pair = [pair[1], e.value as string];
  return pair;
}

function Cells({ label, cells }: { label: string; cells: { key: string; v?: string; cls?: string }[] }) {
  return (
    <div className="array-strip" role="list" aria-label={label}>
      {cells.map((c) => (
        <div key={c.key} role="listitem" className={`cell ${c.cls ?? ''}`} aria-label={`${c.key}: ${c.v ?? 'empty'}`} title={c.key}>
          {c.v ?? '·'}
        </div>
      ))}
    </div>
  );
}

export default function TimeSpaceModule() {
  const { algo, n, step, yMetric, predictions, bench, benchRunning } = useTimeSpaceStore();
  const { setAlgo, setN, setStep, setYMetric, predict, runBench } = useTimeSpaceStore.getState();
  useUrlParams('time-space', { algo, n, step, y: yMetric });

  const trace = useMemo(() => runTrace(META[algo].generator, { n }), [algo, n]);
  const nodes = useMemo(() => buildCallTree(trace.steps, 'total'), [trace]);
  // The memoised tree collapses out of the naive one, so both draw against the naive layout.
  const reference = useMemo(
    () => (algo === 'memo' && n <= maxN('naive') ? buildCallTree(runTrace(fibNaive, { n }).steps, 'total') : undefined),
    [algo, n],
  );
  const maxStep = trace.steps.length;
  const s = Math.min(step, maxStep);
  const frame = frameAt<FibSnapshot>(trace, s);

  const series: ScalingSeries[] = FIB_ALGOS.flatMap((a) => {
    const pts = (bench[a] ?? [])
      .filter((p) => !p.truncated)
      .map((p) => ({ n: p.n, ops: yMetric === 'ops' ? p.ops : p.peakMem + p.peakStack }));
    if (pts.length === 0) return [];
    const fit = !benchRunning && pts.length >= 3 ? bestFit(pts.map((p) => ({ n: p.n, y: p.ops }))) : undefined;
    return [{ label: META[a].name, color: META[a].color, points: pts, fit }];
  });
  const c = frame.counters;
  const markers = [
    { label: META[algo].name, color: META[algo].color, n, ops: yMetric === 'ops' ? c.totalOps : c.memCells + c.stackDepth },
  ];

  return (
    <div className="stack">
      <section className="panel controls" aria-label="Input">
        <div className="tabs" role="radiogroup" aria-label="Algorithm">
          {FIB_ALGOS.map((a) => (
            <button key={a} role="radio" aria-checked={algo === a} onClick={() => setAlgo(a)}>
              {META[a].name}
            </button>
          ))}
        </div>
        <label>
          n = <span className="mono">{n}</span>
          <input
            type="range"
            min={1}
            max={maxN(algo)}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            aria-label="Input size n"
          />
        </label>
        <span className="muted">
          Computing fib({n}) = <strong className="mono">{trace.result?.toString() ?? '…'}</strong>
        </span>
      </section>

      <div className="grid-2">
        <AlgorithmView title={META[algo].name} event={frame.event}>
          {algo === 'iterative' ? (
            <div className="stack">
              <p style={{ margin: 0 }}>No recursion: a loop that keeps only the last two values.</p>
              <Cells
                label="Two cells"
                cells={lastTwo(trace.steps, s).map((v, i) => ({ key: i === 0 ? 'a' : 'b', v }))}
              />
            </div>
          ) : (
            <div className="stack">
              <p style={{ margin: 0 }} data-testid="call-count">
                <strong className="mono">{nodes.length}</strong> calls, {c.stackDepth} on the stack now (peak{' '}
                {c.peakStack}).
                {algo === 'memo' && reference && (
                  <span className="muted"> Naive recursion makes {reference.length}.</span>
                )}
              </p>
              <CallTreeView nodes={nodes} reference={reference} step={s} />
              {algo === 'memo' && (
                <>
                  <span className="muted">Memo table, index k holds fib(k):</span>
                  <Cells
                    label="Memo table"
                    cells={memoTable(n, trace.steps, s).map((v, k) => ({
                      key: `fib(${k})`,
                      v,
                      cls: frame.snapshot?.k === k ? 'current' : '',
                    }))}
                  />
                </>
              )}
            </div>
          )}
        </AlgorithmView>
        <MemoryView rows={[{ label: META[algo].name, counters: c }]} />
      </div>

      <Timeline step={s} maxStep={maxStep} onStep={(v) => setStep(Math.min(v, maxStep))} />

      <section className="panel emphasis stack" aria-label="Scaling">
        <h2>Scaling: time and space as n grows</h2>
        {FIB_ALGOS.map((a) => (
          <PredictWidget
            key={a}
            algorithm={META[a].name}
            value={predictions[a]}
            onChange={(cls) => predict(a, cls)}
            measured={yMetric === 'ops' ? series.find((x) => x.label === META[a].name)?.fit?.cls : undefined}
            disabled={benchRunning}
          />
        ))}
        <div className="controls">
          <button className="primary" onClick={runBench} disabled={benchRunning}>
            {benchRunning ? 'Running…' : 'Run scaling experiment'}
          </button>
          <label>
            Plot
            <select aria-label="Scaling metric" value={yMetric} onChange={(e) => setYMetric(e.target.value as typeof yMetric)}>
              <option value="ops">Operations (time)</option>
              <option value="mem">Peak memory: cells + stack frames (space)</option>
            </select>
          </label>
        </div>
        <ScalingView
          series={series}
          markers={markers}
          domain={DOMAIN}
          yLabel={yMetric === 'ops' ? 'operations' : 'peak memory (cells + frames)'}
        />
        <p className="muted" style={{ margin: 0 }}>
          Naive recursion stops at n = 30, where it already makes over two million calls. Memoisation buys linear
          time with n table cells; the loop needs neither the table nor the stack.
        </p>
      </section>
    </div>
  );
}
