import { useMemo } from 'react';
import { bfs } from '../../algorithms/graph/bfs';
import { dfs } from '../../algorithms/graph/dfs';
import { TRAVERSAL_KINDS } from '../../algorithms/graph/input';
import type { GraphSnapshot, TraversalKind } from '../../algorithms/graph/input';
import { replayGraph } from '../../algorithms/graph/replay';
import { bestFit } from '../../engine/fit';
import { runTrace } from '../../engine/runner';
import { graphAlgoId, TRAVERSALS, useGraphsStore } from '../../store/graphs';
import type { TMetric, Traversal } from '../../store/graphs';
import { MemoryView } from '../../views/MemoryView';
import { RaceView } from '../../views/RaceView';
import { ScalingView } from '../../views/ScalingView';
import type { ScalingSeries } from '../../views/ScalingView';
import { Timeline } from '../../views/Timeline';
import { frameAt } from '../../views/trace-frames';
import { findAlgorithm } from '../registry';
import { FrontierView } from './FrontierView';
import { GraphView } from './GraphView';

const META: Record<Traversal, { name: string; color: string; frontier: string; generator: typeof bfs }> = {
  bfs: { name: 'BFS', color: '#4c78e0', frontier: 'Queue (front → back)', generator: bfs },
  dfs: { name: 'DFS', color: '#e08a2e', frontier: 'Stack (bottom → top)', generator: dfs },
};

export function TraversalTab() {
  const { graph, source, step, tKind, tMetric, bench, benchRunning } = useGraphsStore();
  const { setStep, setTKind, setTMetric, runTraversalBench } = useGraphsStore.getState();

  const traces = useMemo(
    () => (graph.n === 0 ? [] : TRAVERSALS.map((a) => ({ a, trace: runTrace(META[a].generator, { g: graph, source }) }))),
    [graph, source],
  );
  const maxStep = Math.max(0, ...traces.map((t) => t.trace.steps.length));
  const s = Math.min(step, maxStep);
  const frontierEntries = useMemo(
    () => traces.map(({ a, trace }) => ({ name: META[a].name, color: META[a].color, trace })),
    [traces],
  );

  const series: ScalingSeries[] = TRAVERSALS.flatMap((a) => {
    const pts = (bench[a] ?? [])
      .filter((p) => !p.truncated)
      .map((p) => ({ n: p.n, ops: tMetric === 'ops' ? p.ops : Math.max(0, p.peakMem - p.n) }));
    if (pts.length === 0) return [];
    const fit = !benchRunning && pts.length >= 3 ? bestFit(pts.map((p) => ({ n: p.n, y: p.ops }))) : undefined;
    return [{ label: META[a].name, color: META[a].color, points: pts, fit }];
  });
  const domain = useMemo<[number, number]>(() => [1, findAlgorithm(graphAlgoId('bfs')).maxBenchN], []);

  if (graph.n === 0) return <p className="panel">Add a vertex to start.</p>;

  return (
    <div className="stack">
      <div className="grid-2">
        <RaceView<GraphSnapshot>
          step={s}
          metric="total"
          metricLabel="ops"
          n={graph.n}
          entries={traces.map(({ a, trace }) => ({
            key: a,
            algoId: graphAlgoId(a),
            name: META[a].name,
            color: META[a].color,
            trace,
            render: (f) => {
              const st = replayGraph(graph.n, trace.steps, f.step);
              return (
                <div className="stack" style={{ gap: 6 }}>
                  <GraphView graph={graph} source={source} label={`${META[a].name} on the graph`} state={st} current={f.snapshot?.u} />
                  <div className="mono" style={{ fontSize: 13 }} aria-label={`${META[a].name} frontier`}>
                    {META[a].frontier}: {st.frontier.length ? st.frontier.join(' ') : '—'}
                  </div>
                </div>
              );
            },
          }))}
        />
        <div className="stack top">
          <FrontierView entries={frontierEntries} n={graph.n} step={s} />
          <MemoryView rows={traces.map(({ a, trace }) => ({ label: META[a].name, counters: frameAt(trace, s).counters }))} />
        </div>
      </div>

      <Timeline step={s} maxStep={maxStep} onStep={(v) => setStep(Math.min(v, maxStep))} />

      <section className="panel emphasis stack" aria-label="Scaling">
        <h2>Scaling: same time, different memory</h2>
        <div className="controls">
          <label>
            Graph family
            <select value={tKind} onChange={(e) => setTKind(e.target.value as TraversalKind)}>
              {TRAVERSAL_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Plot
            <select aria-label="Scaling metric" value={tMetric} onChange={(e) => setTMetric(e.target.value as TMetric)}>
              <option value="frontier">Peak frontier (queue or stack cells)</option>
              <option value="ops">Operations</option>
            </select>
          </label>
          <button className="primary" onClick={runTraversalBench} disabled={benchRunning}>
            {benchRunning ? 'Running…' : 'Run scaling experiment'}
          </button>
        </div>
        <ScalingView
          series={series}
          domain={domain}
          yLabel={tMetric === 'ops' ? 'operations' : 'peak frontier cells'}
        />
        <p className="muted" style={{ margin: 0 }}>
          Both searches look at every vertex and edge once: Θ(V + E). On a wide tree the BFS queue holds a whole level
          (about V/2) while the DFS stack only holds one root-to-leaf path (log V); on a path it is the other way round.
        </p>
      </section>
    </div>
  );
}
