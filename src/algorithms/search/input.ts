import type { Rng } from '../../engine/rng';
import { randInt } from '../../engine/rng';

export interface SearchInput {
  /** Sorted, distinct, even values 0, 2, 4, …; odd targets are guaranteed absent. */
  arr: number[];
  target: number;
}

export type SearchInputKind = 'worst' | 'random';

export const SEARCH_INPUT_KINDS: { id: SearchInputKind; label: string; random?: boolean }[] = [
  { id: 'worst', label: 'Worst case (target absent, larger than all)' },
  { id: 'random', label: 'Random target present in the array', random: true },
];

export function makeSearchInput(n: number, kind: SearchInputKind, rng: Rng): SearchInput {
  const arr = Array.from({ length: n }, (_, i) => 2 * i);
  const target = kind === 'worst' ? 2 * n + 1 : 2 * randInt(rng, 0, n);
  return { arr, target };
}

/** Snapshot shared by both searches so one view can draw either. */
export interface SearchSnapshot {
  /** Index being inspected. */
  i?: number;
  /** Remaining candidate range [lo, hi] (binary search only). */
  lo?: number;
  hi?: number;
  found?: number;
}
