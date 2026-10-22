import { describe, expect, it } from 'vitest';
import {
  decodeCnf,
  DimacsError,
  encodeCnf,
  isSatisfiable,
  makePreset,
  parseDimacs,
  pigeonhole,
  PRESETS,
  randomKSat,
  satisfies,
  toDimacs,
} from '../../../src/algorithms/sat/cnf';
import type { Cnf } from '../../../src/algorithms/sat/cnf';
import { dpll } from '../../../src/algorithms/sat/dpll';
import type { Heuristic, SatInput } from '../../../src/algorithms/sat/input';
import { truthTable } from '../../../src/algorithms/sat/truth-table';
import { buildCallTree } from '../../../src/engine/calltree';
import { mulberry32, randInt } from '../../../src/engine/rng';
import { runCount, runTrace } from '../../../src/engine/runner';

const CONFIGS: Omit<SatInput, 'cnf'>[] = [
  ...(['first', 'moms', 'jw'] as Heuristic[]).flatMap((heuristic) => [
    { heuristic, propagate: true, pure: true },
    { heuristic, propagate: true, pure: false },
  ]),
  { heuristic: 'first', propagate: false, pure: false },
  { heuristic: 'jw', propagate: false, pure: true },
];
const tt = (cnf: Cnf) => runCount(truthTable, { cnf, ...CONFIGS[0]! }).result;

describe('SAT solvers', () => {
  it('truth table and every DPLL configuration agree on 1,000 random formulas, with valid models', () => {
    const rng = mulberry32(11);
    for (let k = 0; k < 1000; k++) {
      const cnf = randomKSat(randInt(rng, 1, 9), 1 + rng() * 7, randInt(rng, 1, 4), rng);
      const sat = isSatisfiable(cnf);
      const model = tt(cnf);
      expect(model !== undefined).toBe(sat);
      if (model) expect(satisfies(cnf, model)).toBe(true);
      for (const opts of CONFIGS) {
        const r = runCount(dpll, { cnf, ...opts }).result;
        expect(r !== undefined).toBe(sat);
        if (r) expect(satisfies(cnf, r)).toBe(true);
      }
    }
  });

  it('handles empty formulas and empty clauses', () => {
    for (const opts of CONFIGS) {
      expect(runCount(dpll, { cnf: { n: 2, clauses: [] }, ...opts }).result).toHaveLength(2);
      expect(runCount(dpll, { cnf: { n: 2, clauses: [[1], []] }, ...opts }).result).toBeUndefined();
    }
  });

  it('pigeonhole formulas are unsatisfiable for every configuration', () => {
    for (const h of [2, 3, 4]) {
      const cnf = pigeonhole(h);
      expect(tt(cnf)).toBeUndefined();
      for (const opts of CONFIGS) expect(runCount(dpll, { cnf, ...opts }).result).toBeUndefined();
    }
  });

  it('pins decision and propagation counts on fixed formulas', () => {
    const example = makePreset('example', mulberry32(1));
    const c = runCount(dpll, { cnf: example, heuristic: 'first', propagate: true, pure: false }).counters;
    // Decide x1, x2, x3; then (¬x1 ∨ ¬x3 ∨ x4) forces x4, which falsifies (¬x3 ∨ ¬x4); flipping x3 satisfies all.
    expect([c.ops.decide, c.ops.propagate, c.ops.conflict]).toEqual([4, 1, 1]);
    // PHP(3, 2): x1 = 1 forces five assignments and a conflict; its flip x1 = 0 forces five more and a conflict.
    const php = runCount(dpll, { cnf: pigeonhole(3), heuristic: 'first', propagate: true, pure: false }).counters;
    expect([php.ops.decide, php.ops.propagate, php.ops.conflict]).toEqual([2, 10, 2]);
    // Without propagation every conflict needs a full branch down to it.
    const bt = runCount(dpll, { cnf: pigeonhole(3), heuristic: 'first', propagate: false, pure: false }).counters;
    expect(bt.ops.decide).toBeGreaterThan(php.ops.decide);
    expect(bt.ops.propagate).toBe(0);
  });

  it('the search tree has one node per decision, and the trail replays from events', () => {
    const cnf = randomKSat(10, 4.26, 3, mulberry32(5));
    const t = runTrace(dpll, { cnf, heuristic: 'jw', propagate: true, pure: true }, { maxSteps: 1e6 });
    expect(buildCallTree(t.steps)).toHaveLength(t.counters.ops.decide);
    const a = Array(cnf.n + 1).fill(0);
    for (const { event: e } of t.steps) {
      if (e.op === 'decide' || e.op === 'propagate') a[e.indices![0]!] = e.value;
      if (e.op === 'mark' && e.label === 'backtrack') for (const v of e.indices!) a[v] = 0;
    }
    if (t.result) for (const lit of t.result) if (a[Math.abs(lit)] !== 0) expect(a[Math.abs(lit)]).toBe(Math.sign(lit));
    expect(t.counters.stackDepth).toBe(0);
  });

  it('the truth table checks every row of an unsatisfiable formula and stops at its budget', () => {
    const core = makePreset('core', mulberry32(1));
    const c = runCount(truthTable, { cnf: core, ...CONFIGS[0]! }).counters;
    expect(c.ops.write).toBe(8);
    const big = runCount(truthTable, { cnf: randomKSat(30, 10, 3, mulberry32(1)), ...CONFIGS[0]! }, { budget: { maxOps: 1e5 } });
    expect(big.truncated).toBe(true);
  });
});

describe('DIMACS', () => {
  it('round-trips presets and random formulas, in DIMACS and in the URL', () => {
    const rng = mulberry32(3);
    const formulas = [...PRESETS.map((p) => makePreset(p.id, rng)), ...Array.from({ length: 20 }, () => randomKSat(9, 3, 3, rng))];
    for (const cnf of formulas) {
      expect(parseDimacs(toDimacs(cnf))).toEqual(cnf);
      expect(decodeCnf(encodeCnf(cnf), 64)).toEqual(cnf);
    }
  });

  it('accepts comments and clauses spanning lines, and reports errors by line', () => {
    expect(parseDimacs('c hello\np cnf 3 2\n1 -2\n 3 0 -1 0\n')).toEqual({ n: 3, clauses: [[1, -2, 3], [-1]] });
    const err = (text: string) => {
      try {
        parseDimacs(text);
      } catch (e) {
        return e instanceof DimacsError ? e.message : 'not a DimacsError';
      }
      return 'no error';
    };
    expect(err('1 2 0')).toBe('line 1: clause before the "p cnf" header');
    expect(err('p cnf 2 1\n1 3 0')).toBe('line 2: variable 3 is above 2');
    expect(err('p cnf 2 1\n1 x 0')).toBe('line 2: "x" is not a literal');
    expect(err('p cnf 2 2\n1 0')).toBe('line 2: header says 2 clauses, found 1');
    expect(decodeCnf('3:1 4', 64)).toBeUndefined();
  });
});
