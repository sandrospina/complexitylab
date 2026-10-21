import type { Instrument } from '../../engine/instrument';
import type { Algorithm } from '../../engine/runner';
import type { FibInput, FibSnapshot } from './input';

/** Keeps only the last two values: Θ(n) time in two cells. */
export const fibIterative: Algorithm<FibInput, bigint> = function* ({ n }, ins: Instrument) {
  yield ins.alloc<FibSnapshot>(2, { label: 'a, b' });
  let a = 0n;
  let b = 1n;
  for (let k = 2; k <= n; k++) {
    yield ins.compare<FibSnapshot>({ label: `k = ${k} ≤ n?`, snapshot: { k } });
    yield ins.read<FibSnapshot>({ label: 'a, b', snapshot: { k } });
    [a, b] = [b, a + b];
    yield ins.write<FibSnapshot>({ value: b.toString(), snapshot: { k } });
  }
  yield ins.free<FibSnapshot>(2, { label: 'a, b' });
  return n === 0 ? 0n : n === 1 ? 1n : b;
};
