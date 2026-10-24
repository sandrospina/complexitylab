import { useMemo } from 'react';
import { reachBfs } from '../../algorithms/reach/bfs';
import { makeReachInput, REACH_KINDS, savitchK } from '../../algorithms/reach/input';
import type { ReachInput, ReachKind, ReachSnapshot } from '../../algorithms/reach/input';
import { reachSavitch } from '../../algorithms/reach/savitch';
import { bestFit } from '../../engine/fit';
import { mulberry32 } from '../../engine/rng';
import { runTrace } from '../../engine/runner';
import type { Algorithm, TraceResult } from '../../engine/runner';
import { MAX_REACH_N, REACH_ALGOS, useReachStore } from '../../store/reach';
import type { ReachAlgo } from '../../store/reach';
import type { YMetric } from '../../store/time-space';
import { MemoryView } from '../../views/MemoryView';
import { PredictWidget } from '../../views/PredictWidget';
import { RaceView } from '../../views/RaceView';
import { ScalingView } from '../../views/ScalingView';
import type { ScalingSeries } from '../../views/ScalingView';
import { Timeline } from '../../views/Timeline';
import { frameAt } from '../../views/trace-frames';
import type { Frame } from '../../views/trace-frames';
import { ClassMap } from './ClassMap';
import { DigraphView } from './DigraphView';

const META: Record<ReachAlgo, { name: string; color: string; generator: Algorithm<ReachInput, boolean> }> = {
  'reach-bfs': { name: 'Breadth-first search', color: '#c2417a', generator: reachBfs },
  'reach-savitch': { name: 'Savitch', color: '#2e9a6a', generator: reachSavitch },
};
const DOMAIN: [number, number] = [1, 1024];
const Y_LABEL: Record<YMetric, string> = { ops: 'operations', mem: 'peak memory (cells + frames)' };

/** BFS: vertices visited so far, and the one being explored. */
function BfsView({ input, trace, frame }: { input: ReachInput; trace: TraceResult<unknown>; frame: Frame<ReachSnapshot> }) {
  const visited = new Set([input.s]);
  for (const { event: e } of trace.steps.slice(0, frame.step)) if (e.op === 'write' && e.indices) visited.add(e.indices[0]!);
  const running = frame.step < trace.steps.length;
  const u = running ? frame.snapshot?.u : undefined;
  return (
    <DigraphView
      n={input.g.n}
      out={input.g.out}
      label={`Graph with ${input.g.n} vertices; ${visited.size} visited`}
      vertexClass={(v) => (v === u ? 'current' : visited.has(v) ? 'visited' : v === input.t ? 'target' : undefined)}
      edgeClass={(a) => (a === u ? 'hot' : undefined)}
    />
  );
}

/** Savitch: the stack of REACH(u, v, k) calls, its endpoints and midpoints marked on the graph. */
function SavitchView({ input, trace, frame }: { input: ReachInput; trace: TraceResult<unknown>; frame: Frame<ReachSnapshot> }) {
  const stack: ReachSnapshot[] = [];
  for (const { event: e } of trace.steps.slice(0, frame.step)) {
    if (e.op === 'pushFrame') stack.push(e.snapshot as ReachSnapshot);
    else if (e.op === 'popFrame') stack.pop();
  }
  const top = stack.at(-1);
  // Every frame below the top has chosen a midpoint: the start of the frame above it (or its end).
  const mids = new Set(stack.slice(1).map((f, i) => (f.u === stack[i]!.u ? f.v! : f.u!)));
  const bits = Math.max(1, Math.ceil(Math.log2(Math.max(input.g.n, 2))));
  return (
    <div className="tree-layout">
      <DigraphView
        n={input.g.n}
        out={input.g.out}
        label={`Graph with ${input.g.n} vertices${top ? `; asking for a path from ${top.u} to ${top.v} of length at most ${2 ** top.k!}` : ''}`}
        vertexClass={(v) => (top && (v === top.u || v === top.v) ? 'current' : mids.has(v) ? 'mid' : v === input.t ? 'target' : undefined)}
        edgeClass={(a, b) => (top?.k === 0 && a === top.u && b === top.v ? 'hot' : undefined)}
      />
      <div className="stack" style={{ gap: 6, minWidth: 170 }}>
        <ol className="frame-stack" aria-label="Call stack">
          {stack.map((f, i) => (
            <li key={i}>
              REACH({f.u}, {f.v}, {f.k}) <span className="muted">≤ {2 ** f.k!} steps</span>
            </li>
          ))}
        </ol>
        <span className="muted" style={{ fontSize: 12 }} data-testid="savitch-bits">
          {stack.length} of {savitchK(input.g.n) + 1} frames × 4 numbers × {bits} bits = {stack.length * 4 * bits} bits
        </span>
      </div>
    </div>
  );
}

export function SavitchTab() {
  const { n, kind, seed, step, yMetric, predictions, bench, benchRunning } = useReachStore();
  const { configure, setStep, setYMetric, predict, runBench } = useReachStore.getState();
  const input = useMemo(() => makeReachInput(n, kind, mulberry32(seed)), [n, kind, seed]);
  const traces = useMemo(() => REACH_ALGOS.map((a) => ({ a, trace: runTrace(META[a].generator, input) })), [input]);
  const maxStep = Math.max(...traces.map((t) => t.trace.steps.length));
  const s = Math.min(step, maxStep);

  const series: ScalingSeries[] = REACH_ALGOS.flatMap((a) => {
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
      <section className="panel controls" aria-label="Graph">
        <label>
          n = <span className="mono">{n}</span>
          <input type="range" min={2} max={MAX_REACH_N} value={n} onChange={(e) => configure({ n: Number(e.target.value) })} aria-label="Number of vertices n" />
        </label>
        <label>
          Graph
          <select value={kind} onChange={(e) => configure({ kind: e.target.value as ReachKind })}>
            {REACH_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        {kind === 'random' && <button onClick={() => configure({ seed: seed + 1 })}>New graph</button>}
        <span className="mono">
          s = {input.s}, t = {input.t}
        </span>
      </section>

      <p className="muted" style={{ margin: 0 }}>
        Is there a path from s to t? BFS answers fast but remembers every vertex it has seen. Savitch remembers almost
        nothing: a path of length at most 2ᵏ has a midpoint w, so it tries each w and asks the same question of both halves
        with k − 1, reusing the space of the first half for the second. Because the graph can be a machine’s configuration
        graph, this shows that nondeterministic space s can be simulated in deterministic space s²: NPSPACE = PSPACE.
      </p>

      <div className="grid-2">
        <RaceView<ReachSnapshot>
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
                  {a === 'reach-bfs' ? <BfsView input={input} trace={trace} frame={f} /> : <SavitchView input={input} trace={trace} frame={f} />}
                  <span className="mono" style={{ fontSize: 13 }} data-testid={`result-${a}`}>
                    {done ? (trace.result ? `t is reachable from s` : `t is not reachable from s`) : '…'}
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
        <h2>Scaling: log n frames, at a quasi-polynomial price</h2>
        {REACH_ALGOS.map((a) => (
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
        <ScalingView series={series} domain={DOMAIN} xLabel="vertices n" yLabel={Y_LABEL[yMetric]} initialLogY />
        <p className="muted" style={{ margin: 0 }}>
          Savitch’s recursion is only ⌈log₂ n⌉ + 1 frames deep, and each frame holds four numbers below n, so O(log² n)
          bits against BFS’s n flags. It pays in time: nothing is remembered between calls, so the same half-paths are
          solved over and over, about n^(log n) operations, which is slower than any polynomial. Savitch is past 40 million
          operations at 32 vertices, a graph BFS searches in under a hundred. The theorem is about space, not speed.
        </p>
      </section>
    </div>
  );
}
