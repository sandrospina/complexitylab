import type { Algorithm } from '../../engine/runner';
import type { SearchInput, SearchSnapshot } from './input';

/**
 * Iterative binary search. Each loop iteration counts as one (three-way) compare,
 * so the worst case is floor(log2 n) + 1 compares.
 */
export const binarySearch: Algorithm<SearchInput, number> = function* ({ arr, target }, ins) {
  yield ins.alloc<SearchSnapshot>(3, { label: 'lo, hi, mid' });
  let lo = 0;
  let hi = arr.length - 1;
  ins.at(1);
  for (;;) {
    ins.at(2);
    if (lo > hi) break;
    const mid = (lo + hi) >>> 1;
    ins.at(3);
    const v = arr[mid]!;
    yield ins.compare<SearchSnapshot>({ indices: [mid], value: v, snapshot: { i: mid, lo, hi }, line: 4 });
    if (v === target) {
      yield ins.mark<SearchSnapshot>('found', { indices: [mid], snapshot: { i: mid, lo, hi, found: mid } });
      return mid;
    }
    if (v < target) {
      ins.at(5);
      lo = mid + 1;
    } else {
      ins.at(6);
      hi = mid - 1;
    }
  }
  yield ins.mark<SearchSnapshot>('not found', { snapshot: { lo, hi }, line: 7 });
  return -1;
};
