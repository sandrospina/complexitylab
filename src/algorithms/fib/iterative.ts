import type { Instrument } from '../../engine/instrument';
import type { Algorithm } from '../../engine/runner';
import type { FibInput, FibSnapshot } from './input';

/** Keeps only the last two values: Θ(n) time in two cells. */
export const fibIterative: Algorithm<FibInput, bigint> = function* ({ n }, ins: Instrument) {
  yield ins.alloc<FibSnapshot>(2, { label: 'a, b', line: 1 });
  let a = 0n;
  let b = 1n;
  for (let k = 2; k <= n; k++) {
    yield ins.compare<FibSnapshot>({ label: `k = ${k} ≤ n?`, snapshot: { k }, line: 2 });
    yield ins.read<FibSnapshot>({ label: 'a, b', snapshot: { k } });
    [a, b] = [b, a + b];
    yield ins.write<FibSnapshot>({ value: b.toString(), snapshot: { k }, line: 3 });
  }
  // The loop test that fails (or, for n < 2, the only one) is not an op: count it here.
  ins.at(2);
  ins.at(4);
  yield ins.free<FibSnapshot>(2, { label: 'a, b' });
  return n === 0 ? 0n : n === 1 ? 1n : b;
};
