import type { Instrument } from '../../engine/instrument';
import type { Algorithm } from '../../engine/runner';
import { clauseStatus } from './cnf';
import type { Assignment } from './cnf';
import type { SatInput, SatResult, SatSnapshot } from './input';

/**
 * Walks the truth table in binary order (row r sets variable i to bit i − 1 of r) and
 * checks clauses until one is falsified; the first row that falsifies none is a model.
 * On an unsatisfiable formula that is all 2ⁿ rows, whatever its structure. O(n) memory.
 */
export const truthTable: Algorithm<SatInput, SatResult> = function* ({ cnf }, ins: Instrument) {
  const { n, clauses } = cnf;
  const a: Assignment = Array(n + 1).fill(0);
  yield ins.alloc<SatSnapshot>(n + 1, { label: 'assignment' });
  let model: SatResult;
  for (let row = 0; row < 2 ** n && !model; row++) {
    for (let v = 1; v <= n; v++) a[v] = Math.floor(row / 2 ** (v - 1)) % 2 ? 1 : -1;
    yield ins.write<SatSnapshot>({ label: `row ${row}`, snapshot: { row } });
    let ok = true;
    for (let c = 0; c < clauses.length; c++) {
      yield ins.clauseCheck<SatSnapshot>({ indices: [c], snapshot: { row } });
      if (clauseStatus(clauses[c]!, a) === 'falsified') {
        yield ins.mark<SatSnapshot>('falsified', { indices: [c], snapshot: { row } });
        ok = false;
        break;
      }
    }
    if (ok) model = Array.from({ length: n }, (_, i) => a[i + 1]! * (i + 1));
  }
  yield ins.free<SatSnapshot>(n + 1, { label: 'assignment' });
  return model;
};
