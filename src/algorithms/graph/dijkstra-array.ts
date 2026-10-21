import type { Instrument } from '../../engine/instrument';
import type { Algorithm } from '../../engine/runner';
import type { GraphInput, GraphSnapshot } from './input';

/** Dijkstra with the tentative distances in a plain array: each round scans all V for the minimum. */
export const dijkstraArray: Algorithm<GraphInput, number[]> = function* ({ g, source }, ins: Instrument) {
  const dist = Array<number>(g.n).fill(Infinity);
  const done = Array<boolean>(g.n).fill(false);
  yield ins.alloc<GraphSnapshot>(2 * g.n, { label: 'dist, settled' });
  dist[source] = 0;
  yield ins.write<GraphSnapshot>({ indices: [source], value: 0, label: 'dist' });

  for (let round = 0; round < g.n; round++) {
    let u = -1;
    for (let v = 0; v < g.n; v++) {
      yield ins.compare<GraphSnapshot>({ indices: [v], label: 'min scan' });
      if (!done[v] && (u === -1 || dist[v]! < dist[u]!)) u = v;
    }
    if (u === -1 || dist[u] === Infinity) break;
    done[u] = true;
    yield ins.write<GraphSnapshot>({ indices: [u], label: 'settle', snapshot: { u } });
    const vs = g.adj[u]!;
    for (let i = 0; i < vs.length; i++) {
      const v = vs[i]!;
      const d = dist[u]! + g.w[u]![i]!;
      yield ins.read<GraphSnapshot>({ indices: [u, v], snapshot: { u } });
      yield ins.compare<GraphSnapshot>({ indices: [v], label: 'relax', snapshot: { u } });
      if (d < dist[v]!) {
        dist[v] = d;
        yield ins.write<GraphSnapshot>({ indices: [v], value: d, label: 'dist', snapshot: { u } });
      }
    }
  }
  yield ins.free<GraphSnapshot>(2 * g.n, { label: 'dist, settled' });
  return dist;
};
