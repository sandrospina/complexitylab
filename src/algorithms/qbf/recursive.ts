import type { Instrument } from '../../engine/instrument';
import type { Algorithm } from '../../engine/runner';
import { clauseStatus } from '../sat/cnf';
import type { Assignment } from '../sat/cnf';
import { SYMBOL } from './input';
import type { Qbf, QbfSnapshot } from './input';

interface Call {
  i: number;
  stage: 'enter' | 'first' | 'second';
}

/**
 * EVAL(i): the game tree, depth first. At a leaf (i > n) check φ under the assignment;
 * at an ∃ node OR the two children, at a ∀ node AND them, skipping the second child when the
 * first already decides. The stack holds one frame per variable, so space is Θ(n) even
 * though time is up to 2ⁿ leaves: each subtree's space is reused by its sibling.
 */
export const qbfRecursive: Algorithm<Qbf, boolean> = function* ({ prefix, cnf }, ins: Instrument) {
  const { n, clauses } = cnf;
  const a: Assignment = Array(n + 1).fill(0);
  const bits = () => a.slice(1).map((v) => (v > 0 ? '1' : v < 0 ? '0' : '')).join('');
  yield ins.alloc<QbfSnapshot>(n, { label: 'assignment' });
  const stack: Call[] = [{ i: 1, stage: 'enter' }];
  let ret = false;

  while (stack.length > 0) {
    const call = stack.at(-1)!;
    const { i } = call;
    const q = prefix[i - 1]!;
    if (call.stage === 'enter') {
      const leaf = i > n;
      yield ins.pushFrame<QbfSnapshot>({ label: leaf ? `leaf ${bits()}` : `${SYMBOL[q]}x${i}`, value: n + 1 - i, snapshot: { i, bits: bits() } });
      ins.at(1);
      if (leaf) {
        ret = true;
        for (let c = 0; c < clauses.length; c++) {
          yield ins.clauseCheck<QbfSnapshot>({ indices: [c], snapshot: { i, bits: bits() }, line: 2 });
          if (clauseStatus(clauses[c]!, a) === 'falsified') {
            ret = false;
            break;
          }
        }
        yield ins.popFrame<QbfSnapshot>({ value: ret ? 1 : 0, label: ret ? 'true' : 'false' });
        stack.pop();
        continue;
      }
      a[i] = -1;
      yield ins.write<QbfSnapshot>({ indices: [i], label: `x${i} ← false`, value: 0, snapshot: { i, bits: bits() }, line: 3 });
      call.stage = 'first';
      stack.push({ i: i + 1, stage: 'enter' });
    } else if (call.stage === 'first') {
      yield ins.compare<QbfSnapshot>({ label: q === 'E' ? 'true already?' : 'false already?', snapshot: { i, bits: bits() }, line: 4 });
      if (ret === (q === 'E')) {
        a[i] = 0;
        yield ins.popFrame<QbfSnapshot>({ value: ret ? 1 : 0, label: ret ? 'true' : 'false' });
        stack.pop();
        continue;
      }
      a[i] = 1;
      yield ins.write<QbfSnapshot>({ indices: [i], label: `x${i} ← true`, value: 1, snapshot: { i, bits: bits() }, line: 5 });
      call.stage = 'second';
      stack.push({ i: i + 1, stage: 'enter' });
    } else {
      // The second child decides: ∃ was false so far, ∀ true so far.
      a[i] = 0;
      yield ins.popFrame<QbfSnapshot>({ value: ret ? 1 : 0, label: ret ? 'true' : 'false' });
      stack.pop();
    }
  }
  yield ins.free<QbfSnapshot>(n, { label: 'assignment' });
  return ret;
};
