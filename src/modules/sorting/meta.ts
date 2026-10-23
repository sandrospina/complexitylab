import { bubbleSort } from '../../algorithms/sort/bubble';
import { insertionSort } from '../../algorithms/sort/insertion';
import type { SortInput } from '../../algorithms/sort/input';
import { mergeSort } from '../../algorithms/sort/merge';
import { timSort } from '../../algorithms/sort/tim';
import { quickNaive, quickRandom } from '../../algorithms/sort/quick';
import type { Algorithm } from '../../engine/runner';
import type { SortAlgo } from '../../store/sorting';

export const SORT_META: Record<SortAlgo, { name: string; color: string; generator: Algorithm<SortInput, number[]> }> = {
  bubble: { name: 'Bubble sort', color: '#7d5ba6', generator: bubbleSort },
  insertion: { name: 'Insertion sort', color: '#e08a2e', generator: insertionSort },
  merge: { name: 'Merge sort', color: '#4c78e0', generator: mergeSort },
  tim: { name: 'TimSort', color: '#1f9bb0', generator: timSort },
  'quick-naive': { name: 'Quicksort (last pivot)', color: '#c2417a', generator: quickNaive },
  'quick-random': { name: 'Quicksort (random pivot)', color: '#2e9a6a', generator: quickRandom },
};
