import type { Instrument } from '../../engine/instrument';
import type { Algorithm } from '../../engine/runner';
import type { GraphInput, GraphSnapshot } from './input';

interface Call {
  u: number;
  /** Next neighbour to try. */
  i: number;
}

/**
 * Recursive depth-first search, simulated with an explicit stack because a path recurses
 * V deep. Each call is a frame (pushFrame/popFrame) holding one cell: the stack is the frontier.
 * Returns the visit order.
 */
export const dfs: Algorithm<GraphInput, number[]> = function* ({ g, source }, ins: Instrument) {
  const visited = Array<boolean>(g.n).fill(false);
  const order: number[] = [];
  yield ins.alloc<GraphSnapshot>(g.n, { label: 'visited' });
  const stack: Call[] = [];

  function* enter(u: number) {
    visited[u] = true;
    order.push(u);
    yield ins.write<GraphSnapshot>({ indices: [u], label: 'mark visited', snapshot: { u } });
    yield ins.pushFrame<GraphSnapshot>({ label: `dfs(${u})`, indices: [u], snapshot: { u } });
    yield ins.alloc<GraphSnapshot>(1, { indices: [u], label: 'push', snapshot: { u } });
    yield ins.read<GraphSnapshot>({ indices: [u], label: 'visit', snapshot: { u } });
    stack.push({ u, i: 0 });
  }

  yield* enter(source);
  while (stack.length > 0) {
    const call = stack.at(-1)!;
    const { u } = call;
    if (call.i < g.adj[u]!.length) {
      const v = g.adj[u]![call.i++]!;
      yield ins.read<GraphSnapshot>({ indices: [u, v], snapshot: { u } });
      yield ins.compare<GraphSnapshot>({ indices: [v], label: 'visited?', snapshot: { u } });
      if (!visited[v]) yield* enter(v);
    } else {
      stack.pop();
      yield ins.free<GraphSnapshot>(1, { indices: [u], label: 'pop', snapshot: { u: stack.at(-1)?.u } });
      yield ins.popFrame();
    }
  }
  yield ins.free<GraphSnapshot>(g.n, { label: 'visited' });
  return order;
};
