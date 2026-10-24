import { useMemo } from 'react';
import { formatQbf, makeQbfInput, QBF_KINDS, SYMBOL } from '../../algorithms/qbf/input';
import type { Qbf, QbfKind, QbfSnapshot } from '../../algorithms/qbf/input';
import { qbfRecursive } from '../../algorithms/qbf/recursive';
import { qbfTable } from '../../algorithms/qbf/table';
import { buildCallTree } from '../../engine/calltree';
import type { CallNode } from '../../engine/calltree';
import { bestFit } from '../../engine/fit';
import { mulberry32 } from '../../engine/rng';
import { runTrace } from '../../engine/runner';
import type { Algorithm, TraceResult } from '../../engine/runner';
import { MAX_QBF_N, QBF_ALGOS, useQbfStore } from '../../store/qbf';
import type { QbfAlgo } from '../../store/qbf';
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
import { ClassMap } from './ClassMap';

const META: Record<QbfAlgo, { name: string; color: string; generator: Algorithm<Qbf, boolean> }> = {
  'qbf-recursive': { name: 'Recursive evaluation', color: '#2e9a6a', generator: qbfRecursive },
  'qbf-table': { name: 'Bottom-up table', color: '#c2417a', generator: qbfTable },
};
const DOMAIN: [number, number] = [1, 20];
const Y_LABEL: Record<YMetric, string> = { ops: 'operations', mem: 'peak memory (cells + frames)' };

/** The complete game tree, in call order, so the evaluated tree can be drawn as a pruned copy of it. */
function fullTree({ prefix }: Qbf): CallNode[] {
  const nodes: CallNode[] = [];
  const add = (i: number, parent: number | undefined, depth: number) => {
    const id = nodes.length;
    const leaf = i > prefix.length;
    nodes.push({ id, parent, depth, label: leaf ? 'leaf' : `${SYMBOL[prefix[i - 1]!]}x${i}`, size: 0, ownOps: 0, startStep: 0 });
    if (!leaf) {
      add(i + 1, id, depth + 1);
      add(i + 1, id, depth + 1);
    }
  };
  add(1, undefined, 0);
  return nodes;
}

/** The game tree as evaluated: green true, red false, pruned subtrees folded into their parent. */
function GameTree({ qbf, trace, frame }: { qbf: Qbf; trace: TraceResult<unknown>; frame: Frame<QbfSnapshot> }) {
  const nodes = useMemo(() => buildCallTree(trace.steps, 'total'), [trace]);
  const reference = useMemo(() => fullTree(qbf), [qbf]);
  const value = (node: CallNode) => (node.endStep === undefined ? undefined : trace.steps[node.endStep]!.event.value);
  return (
    <CallTreeView
      nodes={nodes}
      reference={reference}
      step={frame.step}
      noun="nodes"
      nodeText={(node) => (node.label === 'leaf' ? '' : node.label.slice(0, 1))}
      nodeClass={(node) => (node.endStep !== undefined && frame.step > node.endStep ? (value(node) ? 'model' : 'conflict') : undefined)}
    />
  );
}

/** The table, root level at the top: each level is the one below folded by its quantifier. */
function TablePyramid({ qbf, trace, frame }: { qbf: Qbf; trace: TraceResult<unknown>; frame: Frame<QbfSnapshot> }) {
  const n = qbf.prefix.length;
  const cells = new Map<string, number>();
  for (const { event: e } of trace.steps.slice(0, frame.step)) if (e.op === 'write' && e.indices) cells.set(e.indices.join(','), e.value as number);
  const now = frame.step < trace.steps.length ? frame.event?.indices?.join(',') : undefined;
  return (
    <div className="stack" style={{ gap: 4 }}>
      {Array.from({ length: n + 1 }, (_, level) => (
        <div key={level} className="qbf-level">
          <span className="mono muted">{level === n ? 'φ' : `${SYMBOL[qbf.prefix[level]!]}x${level + 1}`}</span>
          <div className="array-strip" role="list" aria-label={level === n ? 'Leaves' : `Level ${level}`}>
            {Array.from({ length: 2 ** level }, (_, r) => {
              const v = cells.get(`${level},${r}`);
              const cls = [v === undefined ? '' : v ? 'val-true' : 'val-false', now === `${level},${r}` ? 'current' : ''].join(' ');
              return (
                <div key={r} role="listitem" className={`cell ${cls}`} aria-label={`${level},${r}: ${v === undefined ? 'empty' : v ? 'true' : 'false'}`}>
                  {v === undefined ? '·' : v ? 'T' : 'F'}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function QbfTab() {
  const { n, kind, seed, step, yMetric, predictions, bench, benchRunning } = useQbfStore();
  const { configure, setStep, setYMetric, predict, runBench } = useQbfStore.getState();
  const qbf = useMemo(() => makeQbfInput(n, kind, mulberry32(seed)), [n, kind, seed]);
  const traces = useMemo(() => QBF_ALGOS.map((a) => ({ a, trace: runTrace(META[a].generator, qbf) })), [qbf]);
  const maxStep = Math.max(...traces.map((t) => t.trace.steps.length));
  const s = Math.min(step, maxStep);

  const series: ScalingSeries[] = QBF_ALGOS.flatMap((a) => {
    const pts = (bench[a] ?? [])
      .filter((p) => !p.truncated)
      .map((p) => ({ n: p.n, ops: yMetric === 'ops' ? p.ops : p.peakMem + p.peakStack }));
    if (pts.length === 0) return [];
    const fit = !benchRunning && pts.length >= 3 ? bestFit(pts.map((p) => ({ n: p.n, y: p.ops }))) : undefined;
    return [{ label: META[a].name, color: META[a].color, points: pts, fit }];
  });

  return (
    <div className="stack">
      <ClassMap highlight="PSPACE" />
      <section className="panel controls" aria-label="Formula">
        <label>
          n = <span className="mono">{n}</span>
          <input type="range" min={1} max={MAX_QBF_N} value={n} onChange={(e) => configure({ n: Number(e.target.value) })} aria-label="Number of variables n" />
        </label>
        <label>
          Formula
          <select value={kind} onChange={(e) => configure({ kind: e.target.value as QbfKind })}>
            {QBF_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => configure({ seed: seed + 1 })}>New formula</button>
        <span className="mono" data-testid="qbf-formula">
          {formatQbf(qbf)}
        </span>
      </section>

      <p className="muted" style={{ margin: 0 }}>
        A quantified Boolean formula is a game. The ∃ player picks values to make φ true, the ∀ player to make it false,
        taking turns in the order of the quantifiers. The formula is true when ∃ has a winning strategy. Deciding this
        (TQBF) is PSPACE-complete: every problem solvable in polynomial space reduces to it. SAT is the special case where
        every quantifier is ∃.
      </p>

      <div className="grid-2">
        <RaceView<QbfSnapshot>
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
              const done = f.step >= trace.steps.length;
              return (
                <div className="stack" style={{ gap: 6 }}>
                  {a === 'qbf-recursive' ? <GameTree qbf={qbf} trace={trace} frame={f} /> : <TablePyramid qbf={qbf} trace={trace} frame={f} />}
                  <span className="mono" style={{ fontSize: 13 }} data-testid={`result-${a}`}>
                    {done ? (trace.result ? 'true: ∃ wins' : 'false: ∀ wins') : '…'}
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
        <h2>Scaling: the same 2ⁿ leaves, n cells or 2ⁿ</h2>
        {QBF_ALGOS.map((a) => (
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
        <ScalingView series={series} domain={DOMAIN} xLabel="variables n" yLabel={Y_LABEL[yMetric]} initialLogY />
        <p className="muted" style={{ margin: 0 }}>
          Both methods evaluate up to 2ⁿ leaves, so both take exponential time. The recursion keeps only the path from the
          root to the current leaf: when the false subtree returns, its frames are popped and the true subtree reuses
          them. Space can be reused; time cannot. That is why TQBF is in PSPACE although nobody knows how to decide it in
          polynomial time. On the alternating formulas the recursion also short-circuits (∃ stops at a true child, ∀ at a
          false one), which brings its fitted base below 2. The table stores every leaf before it can apply a single
          quantifier, so it can do neither.
        </p>
      </section>
    </div>
  );
}
