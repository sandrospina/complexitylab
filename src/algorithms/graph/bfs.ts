import type { Instrument } from '../../engine/instrument';
import type { Algorithm } from '../../engine/runner';
import type { GraphInput, GraphSnapshot } from './input';

/**
 * Breadth-first search from the source, marking vertices when they are enqueued.
 * Returns hop distances (−1 if unreachable). The queue is the frontier: one cell per entry.
 */
export const bfs: Algorithm<GraphInput, number[]> = function* ({ g, source }, ins: Instrument) {
  const dist = Array<number>(g.n).fill(-1);
  yield ins.alloc<GraphSnapshot>(g.n, { label: 'visited', line: 1 });
  dist[source] = 0;
  yield ins.write<GraphSnapshot>({ indices: [source], label: 'mark visited', snapshot: { u: source } });
  const queue = [source];
  yield ins.alloc<GraphSnapshot>(1, { indices: [source], label: 'enqueue', line: 2 });

  for (let head = 0; ; head++) {
    ins.at(3);
    if (head >= queue.length) break;
    const u = queue[head]!;
    yield ins.free<GraphSnapshot>(1, { indices: [u], label: 'dequeue', snapshot: { u }, line: 4 });
    yield ins.read<GraphSnapshot>({ indices: [u], label: 'visit', snapshot: { u } });
    for (const v of g.adj[u]!) {
      yield ins.read<GraphSnapshot>({ indices: [u, v], snapshot: { u }, line: 5 });
      yield ins.compare<GraphSnapshot>({ indices: [v], label: 'visited?', snapshot: { u }, line: 6 });
      if (dist[v] === -1) {
        dist[v] = dist[u]! + 1;
        yield ins.write<GraphSnapshot>({ indices: [v], label: 'mark visited', snapshot: { u }, line: 7 });
        queue.push(v);
        yield ins.alloc<GraphSnapshot>(1, { indices: [v], label: 'enqueue', snapshot: { u } });
      }
    }
  }
  yield ins.free<GraphSnapshot>(g.n, { label: 'visited' });
  return dist;
};
