import { describe, expect, it } from 'vitest';
import { bfs } from '../../../src/algorithms/graph/bfs';
import { dfs } from '../../../src/algorithms/graph/dfs';
import { dijkstraArray } from '../../../src/algorithms/graph/dijkstra-array';
import { dijkstraHeap } from '../../../src/algorithms/graph/dijkstra-heap';
import {
  bfsReference,
  decodeGraph,
  dijkstraReference,
  edgesOf,
  encodeGraph,
  fromEdges,
} from '../../../src/algorithms/graph/graph';
import type { Graph } from '../../../src/algorithms/graph/graph';
import { makeDijkstraInput, makeTraversalInput } from '../../../src/algorithms/graph/input';
import { makePreset, PRESETS } from '../../../src/algorithms/graph/presets';
import { replayGraph } from '../../../src/algorithms/graph/replay';
import { mulberry32, randInt } from '../../../src/engine/rng';
import type { Rng } from '../../../src/engine/rng';
import { runCount, runTrace } from '../../../src/engine/runner';

/** A random graph that may be disconnected, with weights 1..9. */
function randomGraph(rng: Rng, n: number, p: number): Graph {
  const edges: [number, number, number][] = [];
  for (let u = 0; u < n; u++) for (let v = u + 1; v < n; v++) if (rng() < p) edges.push([u, v, randInt(rng, 1, 10)]);
  return fromEdges(n, edges);
}

const randomGraphs = () => {
  const rng = mulberry32(5);
  return Array.from({ length: 40 }, (_, k) => randomGraph(rng, 1 + (k % 14), [0.15, 0.3, 0.6][k % 3]!));
};
const frontier = (r: ReturnType<typeof runCount>, n: number) => r.counters.peakMem - n;

describe('BFS and DFS', () => {
  it('BFS finds hop distances', () => {
    for (const g of randomGraphs()) expect(runCount(bfs, { g, source: 0 }).result).toEqual(bfsReference(g, 0));
  });

  it('visit the same set on presets and random graphs', () => {
    const graphs = [...PRESETS.map((p) => makePreset(p.id)), ...randomGraphs()];
    for (const g of graphs) {
      const reached = (runCount(bfs, { g, source: 0 }).result as number[]).flatMap((d, v) => (d >= 0 ? [v] : []));
      const order = runCount(dfs, { g, source: 0 }).result as number[];
      expect([...order].sort((a, b) => a - b)).toEqual(reached);
      expect(new Set(order).size).toBe(order.length);
    }
  });

  it('cost V + 4E + V ops on a connected graph: one visit and one mark per vertex, a read and a check per edge end', () => {
    const { g } = makeTraversalInput(7, 'tree', mulberry32(1));
    const E = edgesOf(g).length;
    for (const algo of [bfs, dfs]) expect(runCount(algo, { g, source: 0 }).counters.totalOps).toBe(7 + 4 * E + 7);
    for (const kind of ['grid', 'dense'] as const) {
      const input = makeTraversalInput(30, kind, mulberry32(2));
      expect(runCount(bfs, input).counters.totalOps).toBe(runCount(dfs, input).counters.totalOps);
    }
  });

  it('BFS needs a wide frontier on a tree, DFS a deep one on a path', () => {
    const V = 255;
    const tree = makeTraversalInput(V, 'tree', mulberry32(1));
    expect(frontier(runCount(bfs, tree), V)).toBeGreaterThanOrEqual(V / 2);
    expect(frontier(runCount(dfs, tree), V)).toBeLessThanOrEqual(Math.log2(V) + 1);
    const path = makeTraversalInput(V, 'path', mulberry32(1));
    expect(frontier(runCount(bfs, path), V)).toBeLessThanOrEqual(2);
    expect(frontier(runCount(dfs, path), V)).toBe(V);
    expect(runCount(dfs, path).counters.peakStack).toBe(V);
  });

  it('replay ends with everything reachable visited and an empty frontier', () => {
    const g = makePreset('grid');
    for (const algo of [bfs, dfs]) {
      const t = runTrace(algo, { g, source: 0 });
      const s = replayGraph(g.n, t.steps, t.steps.length);
      expect(s.done.every(Boolean)).toBe(true);
      expect(s.frontier).toEqual([]);
    }
    const t = runTrace(bfs, { g, source: 0 });
    const mid = t.steps.findIndex((st) => st.counters.peakMem - g.n === 4);
    expect(replayGraph(g.n, t.steps, mid + 1).frontier).toHaveLength(4);
  });
});

describe('Dijkstra', () => {
  it('array and heap agree with Bellman–Ford', () => {
    for (const g of randomGraphs()) {
      const ref = dijkstraReference(g, 0);
      expect(runCount(dijkstraArray, { g, source: 0 }).result).toEqual(ref);
      expect(runCount(dijkstraHeap, { g, source: 0 }).result).toEqual(ref);
    }
  });

  it('adversarial weights make every edge improve a distance', () => {
    for (const [kind, n] of [['degree', 60], ['complete', 25]] as const) {
      const input = makeDijkstraInput(n, kind, mulberry32(3));
      const E = edgesOf(input.g).length;
      if (kind === 'complete') expect(E).toBe((n * (n - 1)) / 2);
      else expect(E).toBe(2 * n);
      const ref = dijkstraReference(input.g, input.source);
      expect([...ref].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i));
      const c = runCount(dijkstraHeap, input).counters;
      // One push for the source and one per edge: each edge improves its far end exactly once.
      expect(c.ops.alloc - 1).toBe(1 + E);
      expect(runCount(dijkstraArray, input).result).toEqual(ref);
    }
  });

  it('the array scans V² for the minimum', () => {
    const input = makeDijkstraInput(20, 'degree', mulberry32(4));
    expect(runCount(dijkstraArray, input).counters.ops.compare).toBeGreaterThanOrEqual(20 * 20);
  });
});

describe('graph URL encoding', () => {
  it('round-trips presets and rejects malformed input', () => {
    for (const p of PRESETS) {
      const g = makePreset(p.id);
      const back = decodeGraph(encodeGraph(g), 30)!;
      const pairs = (x: Graph) => edgesOf(x).map(([u, v]) => [u, v]);
      expect(pairs(back)).toEqual(pairs(g));
      expect(back.n).toBe(g.n);
    }
    expect(decodeGraph('0,0;10,10|0-5', 30)).toBeUndefined();
    expect(decodeGraph('0,0|0-0', 30)).toBeUndefined();
    expect(decodeGraph('', 30)).toBeUndefined();
    expect(decodeGraph('|', 30)?.n).toBe(0);
  });
});
