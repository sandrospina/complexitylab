import type { Instrument } from '../../engine/instrument';
import type { Algorithm } from '../../engine/runner';
import { clauseStatus, litValue } from './cnf';
import type { Assignment } from './cnf';
import type { SatInput, SatResult, SatSnapshot } from './input';

interface Decision {
  /** Trail length before this decision, to undo back to. */
  trailStart: number;
  lit: number;
  flipped: boolean;
}

/**
 * DPLL: decide a literal, propagate its consequences, and on a conflict undo back to the
 * last decision and try its other value (chronological backtracking). The recursion is as
 * deep as the number of variables, so it runs on an explicit stack of decisions; each
 * branch is a frame, so the frames form the search tree.
 *
 * Ops: `decide` per branch, `propagate` per forced (unit or pure) assignment, `conflict`
 * per falsified clause found, and `clauseCheck` per clause visited by propagation, the
 * pure-literal scan and the decision heuristic. Unassignments are uncounted marks.
 */
export const dpll: Algorithm<SatInput, SatResult> = function* ({ cnf, heuristic, propagate, pure }, ins: Instrument) {
  const { n, clauses } = cnf;
  const a: Assignment = Array(n + 1).fill(0);
  const trail: number[] = [];
  const decisions: Decision[] = [];
  yield ins.alloc<SatSnapshot>(2 * (n + 1), { label: 'assignment, trail' });
  const level = () => decisions.length;

  /** Runs propagation to a fixpoint; returns a falsified clause, or −1, and whether all are satisfied. */
  function* settle(): Generator<ReturnType<Instrument['mark']>, { conflict: number; done: boolean }> {
    for (;;) {
      let changed = false;
      let done = true;
      for (let c = 0; c < clauses.length; c++) {
        yield ins.clauseCheck<SatSnapshot>({ indices: [c], snapshot: { level: level() }, line: 8 });
        const status = clauseStatus(clauses[c]!, a);
        if (status === 'falsified') return { conflict: c, done: false };
        if (status !== 'satisfied') done = false;
        if (status === 'unit' && propagate) {
          const lit = clauses[c]!.find((l) => litValue(a, l) === 0)!;
          a[Math.abs(lit)] = Math.sign(lit);
          trail.push(lit);
          yield ins.propagate<SatSnapshot>({ indices: [Math.abs(lit)], value: Math.sign(lit), label: `unit: clause ${c + 1}`, snapshot: { level: level() }, line: 9 });
          changed = true;
        }
      }
      if (done) return { conflict: -1, done: true };
      if (pure && !changed) {
        const seen = Array<number>(n + 1).fill(0); // bit 1: positive, bit 2: negative
        for (let c = 0; c < clauses.length; c++) {
          if (clauseStatus(clauses[c]!, a) === 'satisfied') continue;
          yield ins.clauseCheck<SatSnapshot>({ indices: [c], label: 'pure scan', snapshot: { level: level() }, line: 10 });
          for (const l of clauses[c]!) if (litValue(a, l) === 0) seen[Math.abs(l)]! |= l > 0 ? 1 : 2;
        }
        for (let v = 1; v <= n; v++) {
          if (a[v] !== 0 || (seen[v] !== 1 && seen[v] !== 2)) continue;
          const lit = seen[v] === 1 ? v : -v;
          a[v] = Math.sign(lit);
          trail.push(lit);
          yield ins.propagate<SatSnapshot>({ indices: [v], value: Math.sign(lit), label: 'pure literal', snapshot: { level: level() }, line: 10 });
          changed = true;
        }
      }
      if (!changed) return { conflict: -1, done: false };
    }
  }

  /** The next decision literal, or 0 if every variable is assigned. */
  function* choose(): Generator<ReturnType<Instrument['mark']>, number> {
    if (heuristic === 'first') {
      for (let v = 1; v <= n; v++) if (a[v] === 0) return v;
      return 0;
    }
    // Scores over clauses not yet satisfied, sized by their unassigned literals.
    const score = new Map<number, number>();
    let minSize = Infinity;
    const open: [number, number[]][] = [];
    for (let c = 0; c < clauses.length; c++) {
      if (clauseStatus(clauses[c]!, a) === 'satisfied') continue;
      yield ins.clauseCheck<SatSnapshot>({ indices: [c], label: heuristic, snapshot: { level: level() }, line: 11 });
      const free = clauses[c]!.filter((l) => litValue(a, l) === 0);
      open.push([free.length, free]);
      minSize = Math.min(minSize, free.length);
    }
    for (const [size, free] of open) {
      // MOMS counts literals in the shortest clauses; Jeroslow–Wang weighs every clause by 2^−size.
      const w = heuristic === 'moms' ? (size === minSize ? 1 : 0) : 2 ** -size;
      for (const l of free) score.set(l, (score.get(l) ?? 0) + w);
    }
    let best = 0;
    let bestScore = -1;
    for (let v = 1; v <= n; v++) {
      if (a[v] !== 0) continue;
      const s = (score.get(v) ?? 0) + (score.get(-v) ?? 0);
      if (s > bestScore) {
        bestScore = s;
        best = (score.get(-v) ?? 0) > (score.get(v) ?? 0) ? -v : v;
      }
    }
    return best;
  }

  /** A decision: line 7 for a new one, line 5 for flipping one after a conflict. */
  function* assignDecision(lit: number, line: number) {
    yield ins.pushFrame<SatSnapshot>({ label: `x${Math.abs(lit)}=${lit > 0 ? 1 : 0}`, snapshot: { level: level() } });
    a[Math.abs(lit)] = Math.sign(lit);
    trail.push(lit);
    yield ins.decide<SatSnapshot>({ indices: [Math.abs(lit)], value: Math.sign(lit), snapshot: { level: level() }, line });
  }

  ins.at(1);
  let { conflict, done } = yield* settle();
  let result: SatResult;
  search: for (;;) {
    ins.at(2);
    while (conflict >= 0) {
      yield ins.conflict<SatSnapshot>({ indices: [conflict], label: `clause ${conflict + 1} falsified`, snapshot: { level: level() }, line: 3 });
      // Undo to the latest decision that still has an untried value.
      for (;;) {
        const d = decisions.at(-1);
        if (!d) break search;
        const undone = trail.splice(d.trailStart).map(Math.abs);
        for (const v of undone) a[v] = 0;
        yield ins.mark<SatSnapshot>('backtrack', { indices: undone, snapshot: { level: level() }, line: 4 });
        yield ins.popFrame();
        if (!d.flipped) {
          d.flipped = true;
          d.lit = -d.lit;
          yield* assignDecision(d.lit, 5);
          break;
        }
        decisions.pop();
      }
      ({ conflict, done } = yield* settle());
    }
    if (done) {
      ins.at(6);
      result = Array.from({ length: n }, (_, i) => (a[i + 1]! < 0 ? -(i + 1) : i + 1));
      break;
    }
    const lit = yield* choose();
    if (lit === 0) {
      // Everything is assigned without a conflict, so every clause is satisfied.
      ins.at(6);
      result = Array.from({ length: n }, (_, i) => (a[i + 1]! < 0 ? -(i + 1) : i + 1));
      break;
    }
    decisions.push({ trailStart: trail.length, lit, flipped: false });
    yield* assignDecision(lit, 7);
    ({ conflict, done } = yield* settle());
  }
  for (let k = 0; k < decisions.length; k++) yield ins.popFrame();
  yield ins.free<SatSnapshot>(2 * (n + 1), { label: 'assignment, trail' });
  return result;
};
