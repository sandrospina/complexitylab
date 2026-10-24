import { describe, expect, it } from 'vitest';
import { makeQbfInput, QBF_KINDS, qbfValue } from '../../../src/algorithms/qbf/input';
import type { Qbf, Quantifier } from '../../../src/algorithms/qbf/input';
import { qbfRecursive } from '../../../src/algorithms/qbf/recursive';
import { qbfTable } from '../../../src/algorithms/qbf/table';
import { randomKSat } from '../../../src/algorithms/sat/cnf';
import { mulberry32, randInt } from '../../../src/engine/rng';
import { runCount } from '../../../src/engine/runner';

describe('quantified Boolean formulas', () => {
  it('both evaluators agree with the reference on random prefixes and formulas', () => {
    const rng = mulberry32(3);
    let trues = 0;
    for (let k = 0; k < 400; k++) {
      const n = randInt(rng, 1, 9);
      const prefix = Array.from({ length: n }, (): Quantifier => (rng() < 0.5 ? 'E' : 'A'));
      const q: Qbf = { prefix, cnf: randomKSat(n, 1 + 3 * rng(), 3, rng) };
      const want = qbfValue(q);
      if (want) trues++;
      expect(runCount(qbfRecursive, q).result).toBe(want);
      expect(runCount(qbfTable, q).result).toBe(want);
    }
    // Both answers occur, so the agreement is not vacuous.
    expect(trues).toBeGreaterThan(50);
    expect(trues).toBeLessThan(350);
  });

  it('textbook cases: ∀x ∃y (x ↔ y) is true, ∃y ∀x (x ↔ y) is false', () => {
    const iff = { n: 2, clauses: [[-1, 2], [1, -2]] };
    expect(runCount(qbfRecursive, { prefix: ['A', 'E'], cnf: iff }).result).toBe(true);
    const swapped = { n: 2, clauses: [[-2, 1], [2, -1]] };
    expect(runCount(qbfRecursive, { prefix: ['E', 'A'], cnf: swapped }).result).toBe(false);
  });

  it('the generated kinds have the answers their names promise', () => {
    for (const n of [1, 3, 6]) {
      expect(qbfValue(makeQbfInput(n, 'exists-unsat', mulberry32(1)))).toBe(false);
      expect(qbfValue(makeQbfInput(n, 'forall-taut', mulberry32(1)))).toBe(true);
    }
    expect(QBF_KINDS.map((k) => k.id)).toEqual(['alternating', 'exists-unsat', 'forall-taut']);
  });

  it('on the full-tree kinds the recursion visits all 2ⁿ leaves in n + 1 frames; the table stores 2ⁿ cells', () => {
    for (const n of [1, 4, 10]) {
      for (const kind of ['exists-unsat', 'forall-taut'] as const) {
        const q = makeQbfInput(n, kind, mulberry32(1));
        const rec = runCount(qbfRecursive, q).counters;
        expect(rec.ops.pushFrame).toBe(2 ** (n + 1) - 1);
        expect(rec.peakStack).toBe(n + 1);
        expect(rec.peakMem).toBe(n);
        const tab = runCount(qbfTable, q).counters;
        expect(tab.peakMem).toBe(2 ** n);
        expect(tab.peakStack).toBe(0);
        // Same leaves, same clause checks.
        expect(tab.ops.clauseCheck).toBe(rec.ops.clauseCheck);
      }
    }
  });

  it('short-circuit: the recursion never visits more leaves than the table evaluates', () => {
    const rng = mulberry32(9);
    for (let k = 0; k < 50; k++) {
      const q = makeQbfInput(10, 'alternating', rng);
      expect(runCount(qbfRecursive, q).counters.ops.clauseCheck).toBeLessThanOrEqual(runCount(qbfTable, q).counters.ops.clauseCheck);
    }
  });
});
