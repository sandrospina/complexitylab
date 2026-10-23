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
  yield ins.alloc<GraphSnapshot>(g.n, { label: 'dist', line: 1 });

  /** INSERT; `line` tags its sift-up (left untagged for the source, part of line 1's setup). */
  function* push(d: number, v: number, u?: number, line?: number) {
    heap.push([d, v]);
    yield ins.alloc<GraphSnapshot>(1, { indices: [v], label: 'heap push', snapshot: { u } });
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      yield ins.compare<GraphSnapshot>({ label: 'sift up', snapshot: { u }, line });
      if (heap[p]![0] <= heap[i]![0]) break;
      [heap[p], heap[i]] = [heap[i]!, heap[p]!];
      yield ins.swap<GraphSnapshot>({ label: 'sift up', snapshot: { u }, line });
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
        yield ins.compare<GraphSnapshot>({ label: 'sift down', line: 3 });
        if (heap[r]![0] < heap[l]![0]) c = r;
      }
      yield ins.compare<GraphSnapshot>({ label: 'sift down', line: 3 });
      if (heap[i]![0] <= heap[c]![0]) break;
      [heap[i], heap[c]] = [heap[c]!, heap[i]!];
      yield ins.swap<GraphSnapshot>({ label: 'sift down', line: 3 });
      i = c;
    }
    return top;
  }

  dist[source] = 0;
  yield ins.write<GraphSnapshot>({ indices: [source], value: 0, label: 'dist' });
  yield* push(0, source);
  for (;;) {
    ins.at(2);
    if (heap.length === 0) break;
    const [d, u] = yield* pop();
    yield ins.compare<GraphSnapshot>({ indices: [u], label: 'stale?', snapshot: { u }, line: 4 });
    if (d > dist[u]!) continue;
    yield ins.write<GraphSnapshot>({ indices: [u], label: 'settle', snapshot: { u } });
    const vs = g.adj[u]!;
    for (let i = 0; i < vs.length; i++) {
      const v = vs[i]!;
      const nd = d + g.w[u]![i]!;
      yield ins.read<GraphSnapshot>({ indices: [u, v], snapshot: { u }, line: 5 });
      yield ins.compare<GraphSnapshot>({ indices: [v], label: 'relax', snapshot: { u }, line: 6 });
      if (nd < dist[v]!) {
        dist[v] = nd;
        yield ins.write<GraphSnapshot>({ indices: [v], value: nd, label: 'dist', snapshot: { u }, line: 7 });
        yield* push(nd, v, u, 8);
      }
    }
  }
  yield ins.free<GraphSnapshot>(g.n, { label: 'dist' });
  return dist;
};
