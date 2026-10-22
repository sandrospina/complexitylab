import { useMemo } from 'react';
import { addVertex, edgesOf, toggleEdge } from '../../algorithms/graph/graph';
import type { Graph } from '../../algorithms/graph/graph';
import { CANVAS } from '../../algorithms/graph/presets';
import { clique } from '../../algorithms/reductions/clique';
import type { CliqueInstance, CliqueSlots } from '../../algorithms/reductions/clique';
import { coloring } from '../../algorithms/reductions/coloring';
import type { Coloring } from '../../algorithms/reductions/coloring';
import { edgeEnds, edgeRef, nonEdges } from '../../algorithms/reductions/graph-util';
import { hamiltonian } from '../../algorithms/reductions/hamiltonian';
import type { Tour } from '../../algorithms/reductions/hamiltonian';
import { GRAPH_PRESETS } from '../../algorithms/reductions/presets';
import type { GraphPresetId } from '../../algorithms/reductions/presets';
import type { Reduction, Ref } from '../../algorithms/reductions/types';
import { bestFit } from '../../engine/fit';
import { encoderId, MAX_GRAPH_N, MAX_K, useReductionsStore } from '../../store/reductions';
import type { GraphTab } from '../../store/reductions';
import { ScalingView } from '../../views/ScalingView';
import { findAlgorithm } from '../registry';
import { GraphView } from '../graphs/GraphView';
import { Pipeline } from './Pipeline';
import type { DrawProps } from './Pipeline';

export const PALETTE = ['#e0574f', '#4c78e0', '#2e9a6a'];
const fmt = (x: number) => x.toLocaleString('en-US');
const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

/** Graph parts a list of refs mentions, for GraphView's highlight. */
function graphHighlight(g: Graph, refs: Ref[]) {
  const vertices = new Set(refs.filter((r) => r.kind === 'vertex').map((r) => r.id));
  const edges = new Set(
    refs
      .filter((r) => r.kind === 'edge')
      .map((r) => {
        const [u, v] = edgeEnds(g, r.id);
        return `${u}-${v}`;
      }),
  );
  return { vertices, edges };
}

const toRef = (g: Graph) => (part: { vertex: number } | { edge: [number, number] } | undefined): Ref | undefined =>
  !part ? undefined : 'vertex' in part ? { kind: 'vertex', id: part.vertex } : edgeRef(g, ...part.edge);

/** The decoded solution drawn on the graph, per reduction. */
function Drawing({ tab, g, k, d }: { tab: GraphTab; g: Graph; k: number; d: DrawProps<unknown> }) {
  const highlight = graphHighlight(g, d.lit);
  const badEdges = new Set(d.violations.flatMap((v) => [...graphHighlight(g, v.refs).edges]));
  const common = { graph: g, source: -1, highlight, onHover: (p: Parameters<ReturnType<typeof toRef>>[0]) => d.onHover(toRef(g)(p)) };
  if (tab === 'coloring') {
    const col = d.solution as Coloring | undefined;
    return (
      <GraphView
        {...common}
        label="Graph, coloured by the decoded solution"
        vertexColor={(v) => (col?.[v]?.length === 1 ? PALETTE[col[v]![0]!] : undefined)}
        edgeClass={(u, v) => (badEdges.has(`${u}-${v}`) ? 'bad' : undefined)}
      />
    );
  }
  if (tab === 'clique') {
    const members = new Set(((d.solution as CliqueSlots | undefined) ?? []).flat());
    return (
      <div className="stack" style={{ gap: 6 }}>
        <GraphView
          {...common}
          label={`Graph, with the decoded ${k}-clique`}
          vertexColor={(v) => (members.has(v) ? PALETTE[2] : undefined)}
          edgeClass={(u, v) => (members.has(u) && members.has(v) ? 'chosen' : undefined)}
        />
        {members.size > 0 && <span className="mono">clique: {[...members].sort((a, b) => a - b).join(', ')}</span>}
      </div>
    );
  }
  const tour = d.solution as Tour | undefined;
  // Read the tour from vertex 0, whichever position the solver happened to put it in.
  const raw = tour?.every((vs) => vs.length === 1) ? tour.map((vs) => vs[0]!) : [];
  const start = Math.max(0, raw.indexOf(0));
  const order = [...raw.slice(start), ...raw.slice(0, start)];
  const onTour = new Set(order.map((v, p) => `${Math.min(v, order[(p + 1) % order.length]!)}-${Math.max(v, order[(p + 1) % order.length]!)}`));
  return (
    <div className="stack" style={{ gap: 6 }}>
      <GraphView {...common} label="Graph, with the decoded tour" edgeClass={(u, v) => (onTour.has(`${u}-${v}`) ? 'chosen' : undefined)} />
      {order.length > 0 && <span className="mono">tour: {[...order, order[0]].join(' → ')}</span>}
    </div>
  );
}

/** Variables and clauses now, what one more vertex or edge would add, and the fitted growth. */
function ClauseCounter({ tab, g, k }: { tab: GraphTab; g: Graph; k: number }) {
  const { bench, benchRunning } = useReductionsStore();
  const { runCounter } = useReductionsStore.getState();
  const id = encoderId(tab);
  const size = (h: Graph) => {
    const s = tab === 'coloring' ? coloring.size(h) : tab === 'clique' ? clique.size({ g: h, k }) : hamiltonian.size(h);
    return { vars: s.vars, clauses: sum(s.families) };
  };
  const now = size(g);
  const plusVertex = size(addVertex(g, [CANVAS.width / 2, CANVAS.height / 2]));
  const missing = nonEdges(g)[0];
  const plusEdge = missing ? size(toggleEdge(g, ...missing)) : undefined;
  const pts = (bench[id] ?? []).filter((p) => !p.truncated).map((p) => ({ n: p.n, ops: p.ops }));
  const fit = benchRunning !== id && pts.length >= 3 ? bestFit(pts.map((p) => ({ n: p.n, y: p.ops }))) : undefined;
  const spec = findAlgorithm(id);
  const domain = useMemo<[number, number]>(() => [1, spec.inputKinds[0]!.sizes?.at(-1) ?? spec.maxBenchN], [spec]);
  return (
    <section className="panel stack top" aria-label="Clause counter">
      <h2>Clause counter</h2>
      <p style={{ margin: 0 }}>
        V = {g.n}, E = {edgesOf(g).length}: <strong className="mono">{fmt(now.vars)}</strong> variables,{' '}
        <strong className="mono" data-testid="counter-clauses">
          {fmt(now.clauses)}
        </strong>{' '}
        clauses.
      </p>
      <p className="muted" style={{ margin: 0 }} data-testid="counter-delta">
        One more vertex: +{fmt(plusVertex.vars - now.vars)} variables, +{fmt(plusVertex.clauses - now.clauses)} clauses.
        {plusEdge && ` One more edge: ${plusEdge.clauses >= now.clauses ? '+' : '−'}${fmt(Math.abs(plusEdge.clauses - now.clauses))} clauses.`}
      </p>
      <div>
        <button onClick={() => runCounter(id)} disabled={benchRunning === id}>
          {benchRunning === id ? 'Counting…' : `Fit the growth on ${spec.inputKinds[0]!.label.toLowerCase()}`}
        </button>
      </div>
      {pts.length > 0 && (
        <ScalingView
          series={[{ label: 'clauses', color: PALETTE[1]!, points: pts, fit }]}
          domain={domain}
          xLabel={spec.inputKinds[0]!.xLabel ?? 'n'}
          yLabel="clauses"
        />
      )}
    </section>
  );
}

const REDUCTION: Record<GraphTab, { noSolution: string; solutionName: string }> = {
  coloring: { noSolution: 'the graph has no 3-colouring', solutionName: 'colouring' },
  clique: { noSolution: 'the graph has no clique of this size', solutionName: 'clique' },
  hamiltonian: { noSolution: 'the graph has no Hamiltonian cycle', solutionName: 'tour' },
};

export function GraphReductionTab({ tab }: { tab: GraphTab }) {
  const { graph, preset, k, omit } = useReductionsStore();
  const { loadPreset, setGraph, setK, setOmit } = useReductionsStore.getState();
  const instance = useMemo(() => (tab === 'clique' ? { g: graph, k } : graph), [tab, graph, k]);
  const reduction = (tab === 'coloring' ? coloring : tab === 'clique' ? clique : hamiltonian) as Reduction<Graph | CliqueInstance, unknown>;

  return (
    <div className="stack">
      <div className="grid-2">
        <section className="panel stack" aria-label="Graph editor">
          <div className="controls">
            <label>
              Graph
              <select value={preset} onChange={(e) => e.target.value !== 'custom' && loadPreset(e.target.value as GraphPresetId)}>
                {preset === 'custom' && <option value="custom">Your graph</option>}
                {GRAPH_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            {tab === 'clique' && (
              <label>
                k = <span className="mono">{k}</span>
                <input type="range" min={1} max={MAX_K} value={k} onChange={(e) => setK(Number(e.target.value))} aria-label="Clique size k" />
              </label>
            )}
          </div>
          <GraphView
            graph={graph}
            source={-1}
            label={`Graph editor: ${graph.n} vertices`}
            edit={{
              mode: 'edges',
              onAddVertex: (xy) => graph.n < MAX_GRAPH_N && setGraph(addVertex(graph, xy)),
              onToggleEdge: (u, v) => setGraph(toggleEdge(graph, u, v)),
              onSetSource: () => {},
            }}
          />
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Click empty space to add a vertex (up to {MAX_GRAPH_N}); click two vertices to add or remove an edge.
          </p>
        </section>
        <ClauseCounter tab={tab} g={graph} k={k} />
      </div>
      <Pipeline
        key={tab}
        reduction={reduction}
        instance={instance}
        omit={omit}
        setOmit={setOmit}
        draw={(d) => <Drawing tab={tab} g={graph} k={k} d={d} />}
        {...REDUCTION[tab]}
      />
    </div>
  );
}
