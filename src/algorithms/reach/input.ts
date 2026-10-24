import type { Rng } from '../../engine/rng';

/** A directed graph on vertices 0..n−1: `out[u]` lists the heads of u's edges. */
export interface Digraph {
  n: number;
  out: number[][];
}

/** Is t reachable from s? */
export interface ReachInput {
  g: Digraph;
  s: number;
  t: number;
}

/**
 * `unreachable`: the path 0 → 1 → … → n−2, with t = n−1 cut off. No answer is found, so Savitch
 * tries every midpoint at every level. (On a complete graph it would cost n^⌈log n⌉ outright, past
 * the ops budget at 32 vertices; the path keeps every size measurable with the same growth.)
 * `path`: 0 → 1 → … → n−1. `random`: each edge with probability 2/(n − 1), about 2 out of each vertex.
 */
export type ReachKind = 'unreachable' | 'path' | 'random';

export const REACH_KINDS: { id: ReachKind; label: string; random?: boolean }[] = [
  { id: 'unreachable', label: 'A path that stops before t' },
  { id: 'path', label: 'A directed path s → … → t' },
  { id: 'random', label: 'Random, about 2 edges out of each vertex', random: true },
];

export function makeReachInput(n: number, kind: ReachKind, rng: Rng): ReachInput {
  const out: number[][] = Array.from({ length: n }, () => []);
  for (let u = 0; u < n; u++)
    for (let v = 0; v < n; v++) {
      if (u === v) continue;
      if (kind === 'unreachable' ? v === u + 1 && v < n - 1 : kind === 'path' ? v === u + 1 : rng() < 2 / (n - 1)) out[u]!.push(v);
    }
  return { g: { n, out }, s: 0, t: n - 1 };
}

export const hasEdge = (g: Digraph, u: number, v: number) => g.out[u]!.includes(v);

/** Uninstrumented reference, for tests. */
export function reachable({ g, s, t }: ReachInput): boolean {
  const seen = new Set([s]);
  const queue = [s];
  while (queue.length > 0)
    for (const v of g.out[queue.shift()!]!)
      if (!seen.has(v)) {
        seen.add(v);
        queue.push(v);
      }
  return seen.has(t);
}

/** Recursion depth bound: a path visits at most n vertices, so its length is ≤ n − 1 ≤ 2ᵏ. */
export const savitchK = (n: number) => Math.ceil(Math.log2(Math.max(n, 1)));

export interface ReachSnapshot {
  /** BFS: the vertex being explored. Savitch: the call REACH(u, v, k) and its midpoint w. */
  u?: number;
  v?: number;
  k?: number;
  w?: number;
}
