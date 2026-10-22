import { mulberry32, randInt } from '../../engine/rng';
import type { Rng } from '../../engine/rng';
import { edgesOf, fromEdges } from '../graph/graph';
import type { Graph } from '../graph/graph';
import type { Ref } from './types';

export const vertexRef = (v: number): Ref => ({ kind: 'vertex', id: v });
/** Edge u–v (u < v) as a ref; the id packs both ends. */
export const edgeRef = (g: Graph, u: number, v: number): Ref => ({ kind: 'edge', id: Math.min(u, v) * g.n + Math.max(u, v) });
export const edgeEnds = (g: Graph, id: number): [number, number] => [Math.floor(id / g.n), id % g.n];

export const pairs = (g: Graph): [number, number][] => edgesOf(g).map(([u, v]) => [u, v]);

/** Unordered pairs of distinct vertices that are not joined. */
export function nonEdges(g: Graph): [number, number][] {
  const out: [number, number][] = [];
  for (let u = 0; u < g.n; u++) for (let v = u + 1; v < g.n; v++) if (!g.adj[u]!.includes(v)) out.push([u, v]);
  return out;
}

export const adjacent = (g: Graph, u: number, v: number) => g.adj[u]!.includes(v);

/** n vertices and m distinct random edges (fewer if the graph is complete). */
export function randomGraph(n: number, m: number, rng: Rng): Graph {
  const seen = new Set<number>();
  const edges: [number, number, number][] = [];
  const target = Math.min(m, (n * (n - 1)) / 2);
  while (edges.length < target) {
    const u = randInt(rng, 0, n);
    const v = randInt(rng, 0, n);
    if (u === v || seen.has(Math.min(u, v) * n + Math.max(u, v))) continue;
    seen.add(Math.min(u, v) * n + Math.max(u, v));
    edges.push([Math.min(u, v), Math.max(u, v), 1]);
  }
  return fromEdges(n, edges);
}

/** Each pair joined with probability p. */
export function gnp(n: number, p: number, rng: Rng): Graph {
  const edges: [number, number, number][] = [];
  for (let u = 0; u < n; u++) for (let v = u + 1; v < n; v++) if (rng() < p) edges.push([u, v, 1]);
  return fromEdges(n, edges);
}

export const seeded = (seed: number) => mulberry32(seed);
