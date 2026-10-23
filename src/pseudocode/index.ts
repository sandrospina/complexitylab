import { BINARY_SEARCH, INTERPOLATION_SEARCH, JUMP_SEARCH, LINEAR_SEARCH, RECURSIVE_BINARY_SEARCH } from './search';
import { BUBBLE_SORT, INSERTION_SORT, MERGE_SORT, QUICKSORT, TIMSORT } from './sorting';
import type { Pseudocode } from './types';

/** Pseudocode by registry id. Algorithms that share a generator share an entry. */
export const PSEUDOCODE: Record<string, Pseudocode> = {
  'search/linear': LINEAR_SEARCH,
  'search/binary': BINARY_SEARCH,
  'search/binary-recursive': RECURSIVE_BINARY_SEARCH,
  'search/jump': JUMP_SEARCH,
  'search/interpolation': INTERPOLATION_SEARCH,
  'sorting/bubble': BUBBLE_SORT,
  'sorting/insertion': INSERTION_SORT,
  'sorting/merge': MERGE_SORT,
  'sorting/tim': TIMSORT,
  'sorting/quick-naive': QUICKSORT,
  'sorting/quick-random': QUICKSORT,
};

export const pseudocodeFor = (algoId: string): Pseudocode | undefined => PSEUDOCODE[algoId];
