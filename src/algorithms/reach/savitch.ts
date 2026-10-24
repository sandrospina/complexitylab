import type { Instrument } from '../../engine/instrument';
import type { Algorithm } from '../../engine/runner';
import { hasEdge, savitchK } from './input';
import type { ReachInput, ReachSnapshot } from './input';

/**
 * Savitch: is there a path from u to v of length at most 2ᵏ? For k = 0, check u = v or an
 * edge; otherwise try every midpoint w, asking for half-paths u ⇝ w and w ⇝ v of length 2ᵏ⁻¹.
 * Recursion is ⌈log₂ n⌉ deep (shallow enough for real recursion) and each frame holds u, v, k
 * and w, O(log n) bits each: O(log² n) bits in all. Time is n^O(log n): each level tries n midpoints.
 */
export const reachSavitch: Algorithm<ReachInput, boolean> = function* ({ g, s, t }, ins: Instrument) {
  function* reach(u: number, v: number, k: number): Generator<ReturnType<Instrument['mark']>, boolean> {
    yield ins.pushFrame<ReachSnapshot>({ label: `REACH(${u}, ${v}, ${k})`, value: k, snapshot: { u, v, k } });
    let ok = false;
    ins.at(1);
    if (k === 0) {
      yield ins.compare<ReachSnapshot>({ indices: [u, v], label: `${u} = ${v} or ${u} → ${v}?`, snapshot: { u, v, k }, line: 2 });
      ok = u === v || hasEdge(g, u, v);
    } else {
      for (let w = 0; w < g.n && !ok; w++) {
        ins.at(3);
        ins.at(4);
        if (!(yield* reach(u, w, k - 1))) continue;
        ins.at(5);
        ok = yield* reach(w, v, k - 1);
      }
      if (!ok) ins.at(6);
    }
    yield ins.popFrame<ReachSnapshot>({ value: ok ? 1 : 0, label: ok ? 'yes' : 'no' });
    return ok;
  }
  return yield* reach(s, t, savitchK(g.n));
};
