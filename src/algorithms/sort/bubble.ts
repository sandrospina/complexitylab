import type { Algorithm } from '../../engine/runner';
import type { SortInput, SortSnapshot } from './input';

/**
 * Bubble sort with early exit: each pass swaps adjacent pairs that are out of order, so the
 * largest remaining value bubbles to the end; a pass without swaps means the array is sorted.
 * n−1 compares when sorted; n(n−1)/2 compares whenever the smallest value starts last,
 * because small values move left only one place per pass.
 */
export const bubbleSort: Algorithm<SortInput, number[]> = function* ({ arr }, ins) {
  const a = arr.slice();
  yield ins.alloc<SortSnapshot>(3, { label: 'i, end, swapped' });
  let swapped = true;
  for (let end = a.length - 1; end > 0 && swapped; end--) {
    swapped = false;
    for (let i = 0; i < end; i++) {
      yield ins.compare<SortSnapshot>({ indices: [i, i + 1], snapshot: { lo: 0, hi: end } });
      if (a[i]! > a[i + 1]!) {
        [a[i], a[i + 1]] = [a[i + 1]!, a[i]!];
        yield ins.swap<SortSnapshot>({ indices: [i, i + 1], snapshot: { lo: 0, hi: end } });
        swapped = true;
      }
    }
    if (!swapped) yield ins.mark<SortSnapshot>('no swaps: sorted', { snapshot: { lo: 0, hi: end } });
  }
  yield ins.free<SortSnapshot>(3);
  return a;
};
