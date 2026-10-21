import type { Instrument } from '../../engine/instrument';
import type { Algorithm } from '../../engine/runner';
import type { GraphInput, GraphSnapshot } from './input';

/**
 * Dijkstra with a binary min-heap of (distance, vertex) and lazy deletion: an improved
 * distance is pushed again, and stale entries are skipped when popped. One cell per entry.
 */
export const dijkstraHeap: Algorithm<GraphInput, number[]> = function* ({ g, source }, ins: Instrument) {
  const dist = Array<number>(g.n).fill(Infinity);
  const heap: [number, number][] = [];
  yield ins.alloc<GraphSnapshot>(g.n, { label: 'dist' });

  function* push(d: number, v: number, u?: number) {
    heap.push([d, v]);
    yield ins.alloc<GraphSnapshot>(1, { indices: [v], label: 'heap push', snapshot: { u } });
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      yield ins.compare<GraphSnapshot>({ label: 'sift up', snapshot: { u } });
      if (heap[p]![0] <= heap[i]![0]) break;
      [heap[p], heap[i]] = [heap[i]!, heap[p]!];
      yield ins.swap<GraphSnapshot>({ label: 'sift up', snapshot: { u } });
      i = p;
    }
  }

  function* pop() {
    const top = heap[0]!;
    const last = heap.pop()!;
    yield ins.free<GraphSnapshot>(1, { indices: [top[1]], label: 'heap pop', snapshot: { u: top[1] } });
    if (heap.length === 0) return top;
    heap[0] = last;
    yield ins.write<GraphSnapshot>({ label: 'last to root' });
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      if (l >= heap.length) break;
      const r = l + 1;
      let c = l;
      if (r < heap.length) {
        yield ins.compare<GraphSnapshot>({ label: 'sift down' });
        if (heap[r]![0] < heap[l]![0]) c = r;
      }
      yield ins.compare<GraphSnapshot>({ label: 'sift down' });
      if (heap[i]![0] <= heap[c]![0]) break;
      [heap[i], heap[c]] = [heap[c]!, heap[i]!];
      yield ins.swap<GraphSnapshot>({ label: 'sift down' });
      i = c;
    }
    return top;
  }

  dist[source] = 0;
  yield ins.write<GraphSnapshot>({ indices: [source], value: 0, label: 'dist' });
  yield* push(0, source);
  while (heap.length > 0) {
    const [d, u] = yield* pop();
    yield ins.compare<GraphSnapshot>({ indices: [u], label: 'stale?', snapshot: { u } });
    if (d > dist[u]!) continue;
    yield ins.write<GraphSnapshot>({ indices: [u], label: 'settle', snapshot: { u } });
    const vs = g.adj[u]!;
    for (let i = 0; i < vs.length; i++) {
      const v = vs[i]!;
      const nd = d + g.w[u]![i]!;
      yield ins.read<GraphSnapshot>({ indices: [u, v], snapshot: { u } });
      yield ins.compare<GraphSnapshot>({ indices: [v], label: 'relax', snapshot: { u } });
      if (nd < dist[v]!) {
        dist[v] = nd;
        yield ins.write<GraphSnapshot>({ indices: [v], value: nd, label: 'dist', snapshot: { u } });
        yield* push(nd, v, u);
      }
    }
  }
  yield ins.free<GraphSnapshot>(g.n, { label: 'dist' });
  return dist;
};
