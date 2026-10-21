import type { TraceEvent } from '../../engine/events';
import type { Algorithm } from '../../engine/runner';
import type { SearchInput, SearchSnapshot } from './input';

/** Recursive binary search, T(n) = T(n/2) + 1: one frame per halving, a path-shaped call tree. */
export const binarySearchRecursive: Algorithm<SearchInput, number> = function* ({ arr, target }, ins) {
  function* search(lo: number, hi: number): Generator<TraceEvent, number, void> {
    yield ins.pushFrame<SearchSnapshot>({ label: `[${lo}, ${hi}]`, value: Math.max(0, hi - lo + 1), snapshot: { lo, hi } });
    let result = -1;
    if (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const v = arr[mid]!;
      yield ins.compare<SearchSnapshot>({ indices: [mid], value: v, snapshot: { i: mid, lo, hi } });
      if (v === target) {
        yield ins.mark<SearchSnapshot>('found', { indices: [mid], snapshot: { i: mid, lo, hi, found: mid } });
        result = mid;
      } else {
        result = v < target ? yield* search(mid + 1, hi) : yield* search(lo, mid - 1);
      }
    }
    yield ins.popFrame();
    return result;
  }
  return yield* search(0, arr.length - 1);
};
