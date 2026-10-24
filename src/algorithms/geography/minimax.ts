import type { Instrument } from '../../engine/instrument';
import type { Algorithm } from '../../engine/runner';
import type { GeoInput, GeoSnapshot } from './input';

interface Call {
  v: number;
  /** Index of the next successor to try. */
  next: number;
}

/**
 * WIN(v): does the player to move from v win? Yes if some unvisited successor w is a losing
 * position for the opponent. Depth first over the paths of the game, stopping at the first
 * winning move: as many frames as the longest path (up to n), but exponentially many paths.
 * Simulated with an explicit stack, since paths can be n long.
 */
export const geographyMinimax: Algorithm<GeoInput, boolean> = function* ({ g, start }, ins: Instrument) {
  const used = Array<boolean>(g.n).fill(false);
  yield ins.alloc<GeoSnapshot>(g.n, { label: 'visited' });
  used[start] = true;
  const path = [start];
  const stack: Call[] = [];
  let ret = false;

  const enter = function* (v: number) {
    stack.push({ v, next: 0 });
    yield ins.pushFrame<GeoSnapshot>({ label: `at ${v}`, value: g.n - path.length, snapshot: { path: path.slice() } });
  };
  yield* enter(start);
  // `returned`: a child call has just finished, its answer in `ret`.
  let returned = false;
  while (stack.length > 0) {
    const call = stack.at(-1)!;
    if (returned) {
      returned = false;
      const w = path.pop()!;
      used[w] = false;
      yield ins.write<GeoSnapshot>({ indices: [w], label: `unvisit ${w}`, snapshot: { path: path.slice() } });
      ins.at(4);
      if (!ret) {
        // The opponent loses from w: moving there wins.
        ret = true;
        stack.pop();
        yield ins.popFrame<GeoSnapshot>({ value: 1, label: 'win' });
        returned = stack.length > 0;
        continue;
      }
    }
    const succ = g.out[call.v]!;
    if (call.next < succ.length) {
      const w = succ[call.next++]!;
      ins.at(1);
      yield ins.compare<GeoSnapshot>({ indices: [w], label: `visited ${w}?`, snapshot: { path: path.slice() }, line: 2 });
      if (used[w]) continue;
      used[w] = true;
      path.push(w);
      yield ins.write<GeoSnapshot>({ indices: [w], label: `move to ${w}`, snapshot: { path: path.slice() }, line: 3 });
      yield* enter(w);
      continue;
    }
    ins.at(1);
    ins.at(5);
    ret = false;
    stack.pop();
    yield ins.popFrame<GeoSnapshot>({ value: 0, label: 'lose' });
    returned = stack.length > 0;
  }
  yield ins.free<GeoSnapshot>(g.n, { label: 'visited' });
  return ret;
};
