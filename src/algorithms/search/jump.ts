import type { Algorithm } from '../../engine/runner';
import type { SearchInput, SearchSnapshot } from './input';

/**
 * Jump search: check every m-th element, m = ⌊√n⌋, until one is not smaller than the
 * target, then scan that block. At most n/m jumps plus m − 1 scans; m = √n balances the
 * two, so 2√n compares in the worst case.
 */
export const jumpSearch: Algorithm<SearchInput, number> = function* ({ arr, target }, ins) {
  const n = arr.length;
  const m = Math.max(1, Math.floor(Math.sqrt(n)));
  yield ins.alloc<SearchSnapshot>(3, { label: 'block start, jump, m' });
  let lo = 0;
  let at = Math.min(m, n) - 1;
  ins.at(1);
  // Jump while the end of the block is still smaller than the target.
  for (;;) {
    ins.at(2);
    if (at >= n - 1) break;
    yield ins.compare<SearchSnapshot>({ indices: [at], value: arr[at], label: 'jump', snapshot: { i: at, lo, hi: at }, line: 3 });
    if (arr[at]! >= target) break;
    ins.at(4);
    lo = at + 1;
    at = Math.min(at + m, n - 1);
  }
  // The target, if present, is in [lo, at]: scan it.
  for (let i = lo; ; i++) {
    ins.at(5);
    if (i > at || i >= n) break;
    yield ins.compare<SearchSnapshot>({ indices: [i], value: arr[i], label: 'scan', snapshot: { i, lo, hi: at }, line: 6 });
    if (arr[i] === target) {
      yield ins.mark<SearchSnapshot>('found', { indices: [i], snapshot: { i, lo, hi: at, found: i } });
      return i;
    }
    if (arr[i]! > target) {
      ins.at(7);
      break;
    }
  }
  yield ins.mark<SearchSnapshot>('not found', { snapshot: { lo, hi: at }, line: 8 });
  return -1;
};
