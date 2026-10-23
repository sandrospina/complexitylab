import { useMemo } from 'react';
import { lcsHirschberg } from '../../algorithms/lcs/hirschberg';
import { LCS_KINDS, makeLcsInput } from '../../algorithms/lcs/input';
import type { LcsInput, LcsKind, LcsResult, LcsSnapshot } from '../../algorithms/lcs/input';
import { lcsRows } from '../../algorithms/lcs/rows';
import { lcsTable } from '../../algorithms/lcs/table';
import { buildCallTree } from '../../engine/calltree';
import { bestFit } from '../../engine/fit';
import { mulberry32 } from '../../engine/rng';
import { runTrace } from '../../engine/runner';
import type { Algorithm, TraceResult, TraceStep } from '../../engine/runner';
import { LCS_ALGOS, MAX_LCS_N, useLcsStore } from '../../store/lcs';
import type { LcsAlgo } from '../../store/lcs';
import type { YMetric } from '../../store/time-space';
import { CallTreeView } from '../../views/CallTreeView';
import { MemoryView } from '../../views/MemoryView';
import { PredictWidget } from '../../views/PredictWidget';
import { RaceView } from '../../views/RaceView';
import { ScalingView } from '../../views/ScalingView';
import type { ScalingSeries } from '../../views/ScalingView';
import { Timeline } from '../../views/Timeline';
import { frameAt } from '../../views/trace-frames';
import type { Frame } from '../../views/trace-frames';

const META: Record<LcsAlgo, { name: string; color: string; generator: Algorithm<LcsInput, LcsResult> }> = {
  'lcs-table': { name: 'Full table', color: '#c2417a', generator: lcsTable },
  'lcs-rows': { name: 'Two rows (length only)', color: '#e08a2e', generator: lcsRows },
  'lcs-hirschberg': { name: 'Hirschberg', color: '#2e9a6a', generator: lcsHirschberg },
};
const DOMAIN: [number, number] = [1, 2 ** 10];
const Y_LABEL: Record<YMetric, string> = { ops: 'operations', mem: 'peak memory (cells + frames)' };

/** Cell values written so far, keyed "i,j"; `path` cells marked by the walk back. */
function replayCells(steps: TraceStep[], upTo: number) {
  const cells = new Map<string, number>();
  const path = new Set<string>();
  const matches: [number, number][] = [];
  for (const { event: e } of steps.slice(0, upTo)) {
    const [i, j] = e.indices ?? [];
    if (i === undefined || j === undefined) continue;
    if (e.op === 'write') cells.set(`${i},${j}`, e.value as number);
    else if (e.op === 'mark' && e.label === 'path') path.add(`${i},${j}`);
    else if (e.op === 'mark' && e.label === 'match') matches.push([i, j]);
  }
  return { cells, path, matches };
}

/** The DP grid: b along the top, a down the side; `rows` limits it to the two live rows. */
function Grid({ input, frame, steps, rows }: { input: LcsInput; frame: Frame<LcsSnapshot>; steps: TraceStep[]; rows?: boolean }) {
  const { a, b } = input;
  const { cells, path } = replayCells(steps, frame.step);
  const cur = frame.snapshot;
  const shown = rows ? [0, 1] : Array.from({ length: a.length + 1 }, (_, i) => i);
  return (
    <table className="lcs-grid" aria-label={rows ? 'The two rows' : 'The table'}>
      <thead>
        <tr>
          <th />
          <th />
          {[...b].map((c, j) => (
            <th key={j} scope="col" className={cur?.j === j + 1 ? 'now' : undefined}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {shown.map((r) => {
          // In two-row mode, physical row r holds logical row i where i % 2 === r.
          const i = rows ? (cur?.i !== undefined ? (cur.i % 2 === r ? cur.i : cur.i - 1) : r) : r;
          return (
            <tr key={r}>
              <th scope="row" className={cur?.i === i ? 'now' : undefined}>
                {rows ? `row ${i < 0 ? '–' : i}` : i === 0 ? '' : a[i - 1]}
              </th>
              {Array.from({ length: b.length + 1 }, (_, j) => {
                const key = rows ? `${r},${j}` : `${i},${j}`;
                const v = j === 0 || (!rows && i === 0) ? 0 : cells.get(key);
                const cls = [cur?.i === i && cur?.j === j ? 'now' : '', path.has(`${i},${j}`) ? 'path' : ''].join(' ');
                return (
                  <td key={j} className={cls}>
                    {v ?? ''}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Hirschberg: the current subproblem on both strings, the letters matched so far, and the call tree. */
function HirschbergView({ input, frame, trace }: { input: LcsInput; frame: Frame<LcsSnapshot>; trace: TraceResult<unknown> }) {
  const { matches } = replayCells(trace.steps, frame.step);
  const nodes = useMemo(() => buildCallTree(trace.steps, 'total'), [trace]);
  // Once the run is over there is no current subproblem to highlight.
  const snap = frame.step >= trace.steps.length ? undefined : frame.snapshot;
  const inA = new Set(matches.map(([i]) => i));
  const inB = new Set(matches.map(([, j]) => j));
  const strip = (s: string, lo: number | undefined, hi: number | undefined, chosen: Set<number>, name: string) => (
    <div className="array-strip" role="list" aria-label={name}>
      {[...s].map((c, k) => (
        <div
          key={k}
          role="listitem"
          className={`cell ${chosen.has(k) ? 'found' : lo !== undefined && hi !== undefined && (k < lo || k >= hi) ? 'out' : ''}`}
        >
          {c}
        </div>
      ))}
    </div>
  );
  return (
    <div className="stack" style={{ gap: 6 }}>
      {strip(input.a, snap?.aLo, snap?.aHi, inA, 'String a')}
      {strip(input.b, snap?.bLo, snap?.bHi, inB, 'String b')}
      {nodes.length > 0 && <CallTreeView nodes={nodes} step={frame.step} nodeText={(n) => String(n.size)} />}
    </div>
  );
}

export function LcsTab() {
  const { n, kind, seed, step, yMetric, predictions, bench, benchRunning } = useLcsStore();
  const { configure, setStep, setYMetric, predict, runBench } = useLcsStore.getState();
  const input = useMemo(() => makeLcsInput(n, kind, mulberry32(seed)), [n, kind, seed]);
  const traces = useMemo(() => LCS_ALGOS.map((a) => ({ a, trace: runTrace(META[a].generator, input) })), [input]);
  const maxStep = Math.max(...traces.map((t) => t.trace.steps.length));
  const s = Math.min(step, maxStep);

  const series: ScalingSeries[] = LCS_ALGOS.flatMap((a) => {
    const pts = (bench[a] ?? [])
      .filter((p) => !p.truncated)
      .map((p) => ({ n: p.n, ops: yMetric === 'ops' ? p.ops : p.peakMem + p.peakStack }));
    if (pts.length === 0) return [];
    const fit = !benchRunning && pts.length >= 3 ? bestFit(pts.map((p) => ({ n: p.n, y: p.ops }))) : undefined;
    return [{ label: META[a].name, color: META[a].color, points: pts, fit }];
  });

  return (
    <div className="stack">
      <section className="panel controls" aria-label="Strings">
        <label>
          n = <span className="mono">{n}</span>
          <input type="range" min={1} max={MAX_LCS_N} value={n} onChange={(e) => configure({ n: Number(e.target.value) })} aria-label="String length n" />
        </label>
        <label>
          Strings
          <select value={kind} onChange={(e) => configure({ kind: e.target.value as LcsKind })}>
            {LCS_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => configure({ seed: seed + 1 })}>New strings</button>
        <span className="mono" data-testid="lcs-strings">
          a = {input.a || '∅'}, b = {input.b || '∅'}
        </span>
      </section>

      <p className="muted" style={{ margin: 0 }}>
        The longest common subsequence: the longest string you can get from both by deleting letters (as in diff, or
        comparing DNA). All three methods fill the same n × n recurrence. What differs is how much of it they keep.
      </p>

      <div className="grid-2">
        <RaceView<LcsSnapshot>
          step={s}
          metric="total"
          metricLabel="ops"
          n={n}
          entries={traces.map(({ a, trace }) => ({
            key: a,
            algoId: `time-space/${a}`,
            name: META[a].name,
            color: META[a].color,
            trace,
            render: (f) => {
              const done = f.step >= trace.steps.length ? (trace.result as LcsResult | undefined) : undefined;
              return (
                <div className="stack" style={{ gap: 6 }}>
                  {a === 'lcs-hirschberg' ? (
                    <HirschbergView input={input} frame={f} trace={trace} />
                  ) : (
                    <Grid input={input} frame={f} steps={trace.steps} rows={a === 'lcs-rows'} />
                  )}
                  <span className="mono" style={{ fontSize: 13 }} data-testid={`result-${a}`}>
                    {done ? `length ${done.length}${done.lcs !== undefined ? `: ${done.lcs || '(empty)'}` : ', the subsequence is lost'}` : '…'}
                  </span>
                </div>
              );
            },
          }))}
        />
        <MemoryView rows={traces.map(({ a, trace }) => ({ label: META[a].name, counters: frameAt(trace, s).counters }))} />
      </div>

      <Timeline step={s} maxStep={maxStep} onStep={(v) => setStep(Math.min(v, maxStep))} />

      <section className="panel emphasis stack" aria-label="Scaling">
        <h2>Scaling: one recurrence, three memory budgets</h2>
        {LCS_ALGOS.map((a) => (
          <PredictWidget
            key={`${a}-${yMetric}`}
            algorithm={`${META[a].name} (${yMetric === 'ops' ? 'time' : 'space'})`}
            value={predictions[`${a}-${yMetric}`]}
            onChange={(c) => predict(`${a}-${yMetric}`, c)}
            measured={series.find((x) => x.label === META[a].name)?.fit?.cls}
            disabled={benchRunning}
          />
        ))}
        <div className="controls">
          <button className="primary" onClick={runBench} disabled={benchRunning}>
            {benchRunning ? 'Running…' : 'Run scaling experiment'}
          </button>
          <label>
            Plot
            <select aria-label="Scaling metric" value={yMetric} onChange={(e) => setYMetric(e.target.value as YMetric)}>
              <option value="mem">Peak memory (space)</option>
              <option value="ops">Operations (time)</option>
            </select>
          </label>
        </div>
        <ScalingView series={series} domain={DOMAIN} xLabel="string length n" yLabel={Y_LABEL[yMetric]} initialLogY />
        <p className="muted" style={{ margin: 0 }}>
          The full table keeps all n² cells so it can walk back and spell out the subsequence. Two rows give the same
          length in O(n) cells but forget how they got there. Hirschberg gets both: it splits a in half, finds where the
          answer crosses the middle row with one pass from the top and one from the bottom, and recurses on the two
          halves. That is about twice the work of the full table, in O(n) cells.
        </p>
      </section>
    </div>
  );
}
