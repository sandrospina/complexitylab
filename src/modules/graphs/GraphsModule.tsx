import { useState } from 'react';
import { encodeGraph, edgesOf } from '../../algorithms/graph/graph';
import type { Graph } from '../../algorithms/graph/graph';
import { CANVAS, MAX_EDITOR_N, PRESETS } from '../../algorithms/graph/presets';
import type { PresetId } from '../../algorithms/graph/presets';
import { TABS, useGraphsStore } from '../../store/graphs';
import type { Tab } from '../../store/graphs';
import { useUrlParams } from '../../store/url-state';
import { DijkstraTab } from './DijkstraTab';
import { GraphView } from './GraphView';
import { TraversalTab } from './TraversalTab';

const TAB_LABEL: Record<Tab, string> = { traversal: 'BFS vs DFS', dijkstra: 'Dijkstra: array vs heap' };

/** The emptiest spot on a coarse grid, for adding a vertex from the keyboard. */
function freeSpot(g: Graph): [number, number] {
  let best: [number, number] = [CANVAS.width / 2, CANVAS.height / 2];
  let bestGap = -1;
  for (let x = 40; x < CANVAS.width; x += 40)
    for (let y = 40; y < CANVAS.height; y += 40) {
      const gap = Math.min(Infinity, ...(g.pos ?? []).map(([px, py]) => Math.hypot(px - x, py - y)));
      if (gap > bestGap) [best, bestGap] = [[x, y], gap];
    }
  return best;
}

function Editor() {
  const { graph, preset, source, tab } = useGraphsStore();
  const { loadPreset, clear, addVertex, toggleEdge, setSource } = useGraphsStore.getState();
  const [mode, setMode] = useState<'edges' | 'source'>('edges');
  return (
    <section className="panel stack" aria-label="Graph editor">
      <h2>Graph</h2>
      <div className="controls">
        <label>
          Preset
          <select
            value={preset}
            onChange={(e) => e.target.value !== 'custom' && loadPreset(e.target.value as PresetId)}
          >
            {preset === 'custom' && <option value="custom">Your graph</option>}
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <div className="tabs" role="radiogroup" aria-label="Click mode">
          <button role="radio" aria-checked={mode === 'edges'} onClick={() => setMode('edges')}>
            Draw edges
          </button>
          <button role="radio" aria-checked={mode === 'source'} onClick={() => setMode('source')}>
            Pick source
          </button>
        </div>
        <button onClick={() => addVertex(freeSpot(graph))} disabled={graph.n >= MAX_EDITOR_N}>
          Add vertex
        </button>
        <button onClick={clear}>Clear</button>
        <span className="muted" data-testid="graph-size">
          V = {graph.n}, E = {edgesOf(graph).length}
        </span>
      </div>
      <GraphView
        graph={graph}
        source={source}
        label={`Graph editor: ${graph.n} vertices`}
        showWeights={tab === 'dijkstra'}
        edit={{ mode, onAddVertex: addVertex, onToggleEdge: toggleEdge, onSetSource: setSource }}
      />
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        Click empty space to add a vertex (up to {MAX_EDITOR_N}); click two vertices to add or remove the edge
        between them. Edge weights are their lengths.
      </p>
    </section>
  );
}

export default function GraphsModule() {
  const { tab, graph, preset, source, step, tKind, tMetric, degree } = useGraphsStore();
  const { setTab } = useGraphsStore.getState();
  useUrlParams('graphs', {
    tab,
    ...(preset === 'custom' ? { g: encodeGraph(graph) } : { preset }),
    src: source,
    step,
    tk: tKind,
    tm: tMetric,
    deg: degree,
  });

  return (
    <div className="stack">
      <div className="tabs" role="tablist" aria-label="Graph views">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>
      <Editor />
      <div role="tabpanel" aria-label={TAB_LABEL[tab]}>
        {tab === 'traversal' ? <TraversalTab /> : <DijkstraTab />}
      </div>
    </div>
  );
}
