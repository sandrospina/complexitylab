/** Undirected weighted graph as adjacency lists: `w[u][i]` is the weight of the edge to `adj[u][i]`. */
export interface Graph {
  n: number;
  adj: number[][];
  w: number[][];
  /** Drawing positions, for graphs that are shown (editor and presets). */
  pos?: [number, number][];
}

export type Edge = [u: number, v: number, w: number];

export function fromEdges(n: number, edges: Edge[], pos?: [number, number][]): Graph {
  const adj: number[][] = Array.from({ length: n }, () => []);
  const w: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v, wt] of edges) {
    adj[u]!.push(v);
    w[u]!.push(wt);
    adj[v]!.push(u);
    w[v]!.push(wt);
  }
  return { n, adj, w, pos };
}

/** Each undirected edge once, as u < v. */
export function edgesOf(g: Graph): Edge[] {
  const out: Edge[] = [];
  g.adj.forEach((vs, u) => vs.forEach((v, i) => u < v && out.push([u, v, g.w[u]![i]!])));
  return out;
}

/** Drawn graphs weigh each edge by its length, so short edges are cheap. */
export const lengthWeight = ([x1, y1]: [number, number], [x2, y2]: [number, number]) =>
  Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / 20));

/** A drawn graph with one more vertex at `xy`, unconnected. */
export function addVertex(g: Graph, xy: [number, number]): Graph {
  return fromEdges(g.n + 1, edgesOf(g), [...(g.pos ?? []), xy]);
}

/** A drawn graph with the edge u–v added, or removed if it was there. */
export function toggleEdge(g: Graph, u: number, v: number): Graph {
  const edges = edgesOf(g);
  const [a, b] = u < v ? [u, v] : [v, u];
  const kept = edges.filter(([x, y]) => x !== a || y !== b);
  if (kept.length === edges.length) kept.push([a, b, lengthWeight(g.pos![a]!, g.pos![b]!)]);
  return fromEdges(g.n, kept, g.pos);
}

/** URL form of a drawn graph: "x,y;x,y;…|u-v,u-v,…". Weights are recomputed from positions. */
export function encodeGraph(g: Graph): string {
  const pos = (g.pos ?? []).map(([x, y]) => `${Math.round(x)},${Math.round(y)}`).join(';');
  return `${pos}|${edgesOf(g).map(([u, v]) => `${u}-${v}`).join(',')}`;
}

export function decodeGraph(raw: string | null, maxN: number): Graph | undefined {
  if (!raw) return undefined;
  const [p = '', e = ''] = raw.split('|');
  const pos = p
    ? p.split(';').map((xy) => xy.split(',').map(Number) as [number, number])
    : [];
  const n = pos.length;
  if (n > maxN || pos.some((xy) => xy.length !== 2 || !xy.every(Number.isFinite))) return undefined;
  const seen = new Set<number>();
  const edges: Edge[] = [];
  for (const uv of e ? e.split(',') : []) {
    const [u, v] = uv.split('-').map(Number) as [number, number];
    if (!Number.isInteger(u) || !Number.isInteger(v) || u === v || u < 0 || v < 0 || u >= n || v >= n) return undefined;
    const key = Math.min(u, v) * n + Math.max(u, v);
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push([u, v, lengthWeight(pos[u]!, pos[v]!)]);
  }
  return fromEdges(n, edges, pos);
}

/** Uninstrumented BFS hop distances (−1 if unreachable), for tests. */
export function bfsReference(g: Graph, s: number): number[] {
  const dist = Array<number>(g.n).fill(-1);
  dist[s] = 0;
  const q = [s];
  for (let h = 0; h < q.length; h++) {
    const u = q[h]!;
    for (const v of g.adj[u]!) {
      if (dist[v] !== -1) continue;
      dist[v] = dist[u]! + 1;
      q.push(v);
    }
  }
  return dist;
}

/** Uninstrumented Bellman–Ford distances (Infinity if unreachable), for tests. */
export function dijkstraReference(g: Graph, s: number): number[] {
  const dist = Array<number>(g.n).fill(Infinity);
  dist[s] = 0;
  for (let round = 0; round < g.n; round++) {
    let changed = false;
    g.adj.forEach((vs, u) =>
      vs.forEach((v, i) => {
        const d = dist[u]! + g.w[u]![i]!;
        if (d < dist[v]!) {
          dist[v] = d;
          changed = true;
        }
      }),
    );
    if (!changed) break;
  }
  return dist;
}
