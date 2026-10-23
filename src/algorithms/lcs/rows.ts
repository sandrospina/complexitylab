import type { Algorithm } from '../../engine/runner';
import type { LcsInput, LcsResult, LcsSnapshot } from './input';

/**
 * The same recurrence keeping only the previous row and the current one: O(nm) time in
 * 2(m + 1) cells. The length survives; the subsequence does not, because the cells a walk
 * back would need have been overwritten. Writes carry [row parity, j].
 */
export const lcsRows: Algorithm<LcsInput, LcsResult> = function* ({ a, b }, ins) {
  const m = b.length;
  let prev = Array<number>(m + 1).fill(0);
  let cur = Array<number>(m + 1).fill(0);
  yield ins.alloc<LcsSnapshot>(2 * (m + 1), { label: 'two rows', line: 1 });
  for (let i = 1; ; i++) {
    ins.at(2);
    if (i > a.length) break;
    cur[0] = 0;
    for (let j = 1; ; j++) {
      ins.at(3);
      if (j > m) break;
      yield ins.compare<LcsSnapshot>({ indices: [i, j], label: `${a[i - 1]} = ${b[j - 1]}?`, snapshot: { i, j }, line: 4 });
      const match = a[i - 1] === b[j - 1];
      if (match) {
        yield ins.read<LcsSnapshot>({ label: 'diagonal', snapshot: { i, j } });
        cur[j] = prev[j - 1]! + 1;
      } else {
        yield ins.read<LcsSnapshot>({ label: 'up', snapshot: { i, j } });
        yield ins.read<LcsSnapshot>({ label: 'left', snapshot: { i, j } });
        cur[j] = Math.max(prev[j]!, cur[j - 1]!);
      }
      yield ins.write<LcsSnapshot>({ indices: [i % 2, j], value: cur[j], snapshot: { i, j }, line: match ? 5 : 6 });
    }
    ins.at(7);
    [prev, cur] = [cur, prev];
  }
  ins.at(8);
  yield ins.free<LcsSnapshot>(2 * (m + 1), { label: 'two rows' });
  return { length: prev[m]! };
};
