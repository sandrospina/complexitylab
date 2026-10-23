import type { Algorithm } from '../../engine/runner';
import type { SearchInput, SearchSnapshot } from './input';

/**
 * Interpolation search: instead of the middle, probe where the target would sit if the
 * values between arr[lo] and arr[hi] were evenly spread. That takes O(log log n) probes on
 * evenly spread values, and up to n when one huge value makes every guess land at lo.
 * Each iteration is two compares: is the target in range, and the three-way probe.
 */
export const interpolationSearch: Algorithm<SearchInput, number> = function* ({ arr, target }, ins) {
  yield ins.alloc<SearchSnapshot>(3, { label: 'lo, hi, pos' });
  let lo = 0;
  let hi = arr.length - 1;
  ins.at(1);
  for (;;) {
    ins.at(2);
    if (lo > hi) break;
    yield ins.compare<SearchSnapshot>({ indices: [lo, hi], label: 'in range?', snapshot: { lo, hi }, line: 3 });
    if (target < arr[lo]! || target > arr[hi]!) break;
    const span = arr[hi]! - arr[lo]!;
    const pos = span === 0 ? lo : lo + Math.floor(((target - arr[lo]!) * (hi - lo)) / span);
    ins.at(4);
    const v = arr[pos]!;
    yield ins.compare<SearchSnapshot>({ indices: [pos], value: v, label: 'probe', snapshot: { i: pos, lo, hi }, line: 5 });
    if (v === target) {
      yield ins.mark<SearchSnapshot>('found', { indices: [pos], snapshot: { i: pos, lo, hi, found: pos } });
      return pos;
    }
    if (v < target) {
      ins.at(6);
      lo = pos + 1;
    } else {
      ins.at(7);
      hi = pos - 1;
    }
  }
  yield ins.mark<SearchSnapshot>('not found', { snapshot: { lo, hi }, line: 8 });
  return -1;
};
