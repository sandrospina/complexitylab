import type { Instrument } from '../../engine/instrument';
import type { Algorithm } from '../../engine/runner';
import type { ReachInput, ReachSnapshot } from './input';

/**
 * Breadth-first search from s, stopping when t is dequeued. Θ(V + E) time, but a visited
 * flag for every vertex: Θ(n) cells, which is what Savitch trades time to avoid.
 */
export const reachBfs: Algorithm<ReachInput, boolean> = function* ({ g, s, t }, ins: Instrument) {
  const visited = Array<boolean>(g.n).fill(false);
  yield ins.alloc<ReachSnapshot>(2 * g.n, { label: 'visited flags and queue', line: 1 });
  visited[s] = true;
  const queue = [s];
  let head = 0;
  let found = false;
  while (head < queue.length) {
    ins.at(2);
    const u = queue[head++]!;
    yield ins.compare<ReachSnapshot>({ indices: [u], label: `${u} = t?`, snapshot: { u }, line: 3 });
    if (u === t) {
      found = true;
      break;
    }
    for (const v of g.out[u]!) {
      ins.at(4);
      yield ins.compare<ReachSnapshot>({ indices: [u, v], label: `visited ${v}?`, snapshot: { u, v }, line: 5 });
      if (!visited[v]) {
        visited[v] = true;
        queue.push(v);
        yield ins.write<ReachSnapshot>({ indices: [v], label: `visit ${v}`, snapshot: { u, v }, line: 6 });
      }
    }
  }
  if (!found) {
    ins.at(2);
    ins.at(7);
  }
  yield ins.free<ReachSnapshot>(2 * g.n, { label: 'visited flags and queue' });
  return found;
};
