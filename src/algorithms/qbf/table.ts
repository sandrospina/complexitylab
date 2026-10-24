import type { Instrument } from '../../engine/instrument';
import type { Algorithm } from '../../engine/runner';
import { clauseStatus } from '../sat/cnf';
import type { Assignment } from '../sat/cnf';
import type { Qbf, QbfSnapshot } from './input';

/**
 * Bottom-up: evaluate φ at all 2ⁿ leaves into a table, then fold the table one quantifier at
 * a time, innermost first, each pair of entries into one with ∨ (∃) or ∧ (∀). The same 2ⁿ
 * leaves as the recursive evaluator, but stored all at once: Θ(2ⁿ) cells, and no short-circuit.
 * Leaf r gives x₁ the top bit of r, so the table reads left to right like the game tree.
 */
export const qbfTable: Algorithm<Qbf, boolean> = function* ({ prefix, cnf }, ins: Instrument) {
  const { n, clauses } = cnf;
  const size = 2 ** n;
  const t: boolean[] = Array<boolean>(size).fill(false);
  const a: Assignment = Array(n + 1).fill(0);
  yield ins.alloc<QbfSnapshot>(size, { label: 'table' });

  for (let r = 0; r < size; r++) {
    ins.at(1);
    for (let i = 1; i <= n; i++) a[i] = Math.floor(r / 2 ** (n - i)) % 2 ? 1 : -1;
    let ok = true;
    for (let c = 0; c < clauses.length; c++) {
      yield ins.clauseCheck<QbfSnapshot>({ indices: [c], snapshot: { level: n }, line: 2 });
      if (clauseStatus(clauses[c]!, a) === 'falsified') {
        ok = false;
        break;
      }
    }
    t[r] = ok;
    yield ins.write<QbfSnapshot>({ indices: [n, r], value: ok ? 1 : 0, snapshot: { level: n } });
  }

  for (let i = n; i >= 1; i--) {
    ins.at(3);
    const exists = prefix[i - 1] === 'E';
    for (let r = 0; r < 2 ** (i - 1); r++) {
      ins.at(4);
      yield ins.read<QbfSnapshot>({ indices: [i, 2 * r], snapshot: { level: i - 1 } });
      yield ins.read<QbfSnapshot>({ indices: [i, 2 * r + 1], snapshot: { level: i - 1 } });
      t[r] = exists ? t[2 * r]! || t[2 * r + 1]! : t[2 * r]! && t[2 * r + 1]!;
      yield ins.write<QbfSnapshot>({ indices: [i - 1, r], value: t[r] ? 1 : 0, snapshot: { level: i - 1 }, line: 5 });
    }
  }
  ins.at(6);
  yield ins.free<QbfSnapshot>(size, { label: 'table' });
  return t[0]!;
};
