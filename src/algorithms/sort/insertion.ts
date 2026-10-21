import type { Algorithm } from '../../engine/runner';
import type { SortInput, SortSnapshot } from './input';

/** Swap-based insertion sort: n−1 compares when sorted, n(n−1)/2 compares and swaps when reversed. */
export const insertionSort: Algorithm<SortInput, number[]> = function* ({ arr }, ins) {
  const a = arr.slice();
  yield ins.alloc<SortSnapshot>(2, { label: 'i, j' });
  for (let i = 1; i < a.length; i++) {
    for (let j = i; j > 0; j--) {
      yield ins.compare<SortSnapshot>({ indices: [j - 1, j], snapshot: { lo: 0, hi: i } });
      if (a[j - 1]! <= a[j]!) break;
      [a[j - 1], a[j]] = [a[j]!, a[j - 1]!];
      yield ins.swap<SortSnapshot>({ indices: [j - 1, j], snapshot: { lo: 0, hi: i } });
    }
  }
  yield ins.free<SortSnapshot>(2);
  return a;
};
