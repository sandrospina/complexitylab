import { useEffect, useMemo } from 'react';
import { dijkstraArray } from '../../algorithms/graph/dijkstra-array';
import { dijkstraHeap } from '../../algorithms/graph/dijkstra-heap';
import type { GraphSnapshot } from '../../algorithms/graph/input';
import { replayGraph } from '../../algorithms/graph/replay';
import { bestFit, extrapolate } from '../../engine/fit';
import { runTrace } from '../../engine/runner';
import { DEGREES, DIJKSTRAS, graphAlgoId, useGraphsStore } from '../../store/graphs';
import type { Dijkstra } from '../../store/graphs';
import { MemoryView } from '../../views/MemoryView';
import { RaceView } from '../../views/RaceView';
import { ScalingView } from '../../views/ScalingView';
import type { ScalingSeries } from '../../views/ScalingView';
import { Timeline } from '../../views/Timeline';
import { frameAt } from '../../views/trace-frames';
import { findAlgorithm } from '../registry';
import { findCrossover } from './crossover';
import type { Crossover } from './crossover';
import { GraphView } from './GraphView';

const META: Record<Dijkstra, { name: string; color: string; generator: typeof dijkstraArray }> = {
  'dijkstra-array': { name: 'Array', color: '#c2417a', generator: dijkstraArray },
  'dijkstra-heap': { name: 'Binary heap', color: '#2e9a6a', generator: dijkstraHeap },
};

const fmt = (n: number) => n.toLocaleString('en-US');

function crossoverText(c: Crossover | undefined): string {
  switch (c?.kind) {
    case undefined:
      return 'Run the experiment to find the crossover.';
    case 'heap-always':
      return 'The heap is cheaper at every measured V.';
    case 'measured':
      return `The heap is cheaper from V ≈ ${fmt(c.n)}.`;
    case 'extrapolated':
      return `The array is cheaper at every measured V; the fitted curves cross at V ≈ ${fmt(c.n)}.`;
    case 'never':
      return 'The array is cheaper at every measured V, and the fitted curves never cross.';
  }
}

export function DijkstraTab() {
  const { graph, source, step, degree, bench, benchRunning } = useGraphsStore();
  const { setStep, setDegree, runDijkstraBench } = useGraphsStore.getState();

  // The scaling experiment is the point of this tab, so it runs on arrival.
  useEffect(() => {
    const { bench: b, benchRunning: running } = useGraphsStore.getState();
    if (!running && !b['dijkstra-heap']?.length) runDijkstraBench();
  }, [runDijkstraBench]);

  const traces = useMemo(
    () => (graph.n === 0 ? [] : DIJKSTRAS.map((a) => ({ a, trace: runTrace(META[a].generator, { g: graph, source }) }))),
    [graph, source],
  );
  const maxStep = Math.max(0, ...traces.map((t) => t.trace.steps.length));
  const s = Math.min(step, maxStep);
  const agree =
    traces.length === 2 && JSON.stringify(traces[0]!.trace.result) === JSON.stringify(traces[1]!.trace.result);

  const series: ScalingSeries[] = DIJKSTRAS.flatMap((a) => {
    const pts = (bench[a] ?? []).filter((p) => !p.truncated).map((p) => ({ n: p.n, ops: p.ops }));
    if (pts.length === 0) return [];
    const fit = !benchRunning && pts.length >= 3 ? bestFit(pts.map((p) => ({ n: p.n, y: p.ops }))) : undefined;
    return [{ label: META[a].name, color: META[a].color, points: pts, fit }];
  });
  const [arr, heap] = DIJKSTRAS.map((a) => series.find((x) => x.label === META[a].name));
  const crossover =
    !benchRunning && arr && heap ? findCrossover(arr.points, heap.points, arr.fit, heap.fit) : undefined;
  const crossN = crossover && 'n' in crossover ? crossover.n : undefined;
  const maxBench = findAlgorithm(graphAlgoId('dijkstra-array')).maxBenchN;
  const domainHi = Math.min(1e5, Math.max(maxBench, crossN ? crossN * 1.5 : 0));
  const domain = useMemo<[number, number]>(() => [1, domainHi], [domainHi]);
  const markers =
    crossN && arr?.fit
      ? [{ label: 'Crossover', color: 'currentColor', n: crossN, ops: extrapolate(arr.fit, crossN) }]
      : [];
  const k = DEGREES.indexOf(degree);

  return (
    <div className="stack">
      <div className="grid-2">
        {graph.n === 0 ? (
          <p className="panel">Add a vertex to start.</p>
        ) : (
          <RaceView<GraphSnapshot>
            step={s}
            metric="total"
            metricLabel="ops"
            n={graph.n}
            entries={traces.map(({ a, trace }) => ({
              key: a,
              algoId: graphAlgoId(a),
              name: `Dijkstra, ${META[a].name.toLowerCase()}`,
              color: META[a].color,
              trace,
              render: (f) => (
                <GraphView
                  graph={graph}
                  source={source}
                  label={`Dijkstra with ${META[a].name.toLowerCase()}: distances so far`}
                  state={replayGraph(graph.n, trace.steps, f.step)}
                  current={f.snapshot?.u}
                  showWeights
                />
              ),
            }))}
          />
        )}
        <div className="stack top">
          {graph.n > 0 && (
            <p className="panel" style={{ margin: 0 }} role="status">
              {agree ? 'Both versions find the same distances.' : 'The two versions disagree!'} Numbers under the
              vertices are tentative distances; settled vertices are filled.
            </p>
          )}
          <MemoryView rows={traces.map(({ a, trace }) => ({ label: META[a].name, counters: frameAt(trace, s).counters }))} />
        </div>
      </div>

      <Timeline step={s} maxStep={maxStep} onStep={(v) => setStep(Math.min(v, maxStep))} />

      <section className="panel emphasis stack" aria-label="Scaling">
        <h2>Scaling: where the heap starts to pay</h2>
        <div className="controls">
          <label>
            Average degree k ={' '}
            <span className="mono" data-testid="degree">
              {degree === 'complete' ? 'V − 1 (complete)' : degree}
            </span>
            <input
              type="range"
              min={0}
              max={DEGREES.length - 1}
              value={k}
              onChange={(e) => setDegree(DEGREES[Number(e.target.value)]!)}
              aria-label="Average degree"
              aria-valuetext={degree === 'complete' ? 'complete graph' : `${degree} edges per vertex`}
            />
          </label>
          {benchRunning && <span className="muted">Running…</span>}
        </div>
        <p style={{ margin: 0 }} data-testid="crossover" data-kind={crossover?.kind} data-n={crossN}>
          <strong>{crossoverText(crossover)}</strong>
        </p>
        <ScalingView series={series} markers={markers} domain={domain} />
        <p className="muted" style={{ margin: 0 }}>
          The array scans all V tentative distances for the minimum each round: Θ(V² + E). The heap pays log V per
          improved distance: Θ((V + E) log V), so it wins while E stays well below V² / log V. The benchmark graphs use
          weights chosen so that every edge improves a distance, the heap&apos;s worst case; with random weights far
          fewer edges do, and the heap looks better still.
        </p>
      </section>
    </div>
  );
}
