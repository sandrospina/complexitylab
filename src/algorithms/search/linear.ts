import type { Algorithm } from '../../engine/runner';
import type { SearchInput, SearchSnapshot } from './input';

/** Scans left to right. One compare per element inspected: n in the worst case. */
export const linearSearch: Algorithm<SearchInput, number> = function* ({ arr, target }, ins) {
  yield ins.alloc<SearchSnapshot>(1, { label: 'i' });
  for (let i = 0; i < arr.length; i++) {
    yield ins.compare<SearchSnapshot>({ indices: [i], value: arr[i], snapshot: { i } });
    if (arr[i] === target) {
      yield ins.mark<SearchSnapshot>('found', { indices: [i], snapshot: { i, found: i } });
      return i;
    }
  }
  yield ins.mark<SearchSnapshot>('not found', { snapshot: {} });
  return -1;
};
