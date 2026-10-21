import type { Rng } from '../../engine/rng';
import { randInt } from '../../engine/rng';
import { shuffle } from '../sort/input';
import { fromEdges } from './graph';
import type { Edge, Graph } from './graph';

export interface GraphInput {
  g: Graph;
  source: number;
}

export type TraversalKind = 'tree' | 'path' | 'grid' | 'dense';

export const TRAVERSAL_KINDS: { id: TraversalKind; label: string; random?: boolean }[] = [
  { id: 'tree', label: 'Binary tree (wide)' },
  { id: 'path', label: 'Path (deep)' },
  { id: 'grid', label: 'Square grid' },
  { id: 'dense', label: 'Dense random (p = ½)', random: true },
];

export type DijkstraKind = 'degree' | 'complete';

export const DIJKSTRA_KINDS: { id: DijkstraKind; label: string; random?: boolean }[] = [
  { id: 'degree', label: 'Average degree k', random: true },
  { id: 'complete', label: 'Complete graph' },
];

export const DEFAULT_DEGREE = 4;

/** Every vertex but 0 joins a random earlier one: a random spanning tree, so the graph is connected. */
function spanningTree(n: number, rng: Rng, weight: (u: number, v: number) => number): Edge[] {
  return Array.from({ length: n - 1 }, (_, i) => {
    const v = i + 1;
    const u = randInt(rng, 0, v);
    return [u, v, weight(u, v)];
  });
}

export function makeTraversalInput(n: number, kind: TraversalKind, rng: Rng): GraphInput {
  const edges: Edge[] = [];
  if (kind === 'tree') for (let v = 1; v < n; v++) edges.push([(v - 1) >> 1, v, 1]);
  else if (kind === 'path') for (let v = 1; v < n; v++) edges.push([v - 1, v, 1]);
  else if (kind === 'grid') {
    const side = Math.ceil(Math.sqrt(n));
    for (let v = 0; v < n; v++) {
      if (v % side > 0) edges.push([v - 1, v, 1]);
      if (v >= side) edges.push([v - side, v, 1]);
    }
  } else {
    const tree = spanningTree(n, rng, () => 1);
    const inTree = new Set(tree.map(([u, v]) => u * n + v));
    edges.push(...tree);
    for (let u = 0; u < n; u++)
      for (let v = u + 1; v < n; v++) if (!inTree.has(u * n + v) && rng() < 0.5) edges.push([u, v, 1]);
  }
  return { g: fromEdges(n, edges), source: 0 };
}

/**
 * Dijkstra's worst case for the heap: every edge improves a tentative distance. In settle
 * order 0, 1, 2, … a chain of weight-1 edges fixes dist(i) = i, and each other edge (i, j),
 * i < j, weighs 2(n − i), so later-settled vertices always offer j a shorter route.
 * Labels are then shuffled so the structure is not visible in the numbering.
 */
export function makeDijkstraInput(n: number, kind: DijkstraKind, rng: Rng, degree = DEFAULT_DEGREE): GraphInput {
  const target = kind === 'complete' ? (n * (n - 1)) / 2 : Math.min((n * (n - 1)) / 2, Math.round((degree * n) / 2));
  const jump = (i: number, j: number) => (j === i + 1 ? 1 : 2 * (n - Math.min(i, j)));
  const edges: Edge[] = [];
  const seen = new Set<number>();
  const add = (i: number, j: number) => {
    const [a, b] = i < j ? [i, j] : [j, i];
    if (a === b || seen.has(a * n + b)) return;
    seen.add(a * n + b);
    edges.push([a, b, jump(a, b)]);
  };
  for (let i = 1; i < n; i++) add(i - 1, i);
  if (kind === 'complete' || target > (n * (n - 1)) / 4) {
    // Dense: sample the edges to leave out instead of the ones to add.
    const all: [number, number][] = [];
    for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) all.push([i, j]);
    shuffle(all, rng);
    for (const [i, j] of all.slice(0, target - edges.length)) add(i, j);
  } else {
    while (edges.length < target) add(randInt(rng, 0, n), randInt(rng, 0, n));
  }
  const perm = shuffle(Array.from({ length: n }, (_, i) => i), rng);
  return { g: fromEdges(n, edges.map(([u, v, w]) => [perm[u]!, perm[v]!, w])), source: perm[0]! };
}

/** The vertex in focus. Visited marks, frontier and distances are replayed from the events. */
export interface GraphSnapshot {
  u?: number;
}
