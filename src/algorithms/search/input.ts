import type { Rng } from '../../engine/rng';
import { randInt } from '../../engine/rng';

export interface SearchInput {
  /** Sorted and distinct. */
  arr: number[];
  target: number;
}

/**
 * `worst`: 0, 2, 4, … with an absent target above them all. `random`: the same array, a
 * random element as target. `uniform`: random gaps, so values spread evenly, and a random
 * element as target: the case interpolation search is built for. `skewed`: 0, 1, …, n − 2
 * and then n², target n − 2: every interpolation guess lands one place along.
 */
export type SearchInputKind = 'worst' | 'random' | 'uniform' | 'skewed';

export const SEARCH_INPUT_KINDS: { id: SearchInputKind; label: string; random?: boolean }[] = [
  { id: 'worst', label: 'Worst case (target absent, larger than all)' },
  { id: 'random', label: 'Random target present in the array', random: true },
  { id: 'uniform', label: 'Evenly spread random values, random target', random: true },
  { id: 'skewed', label: 'Skewed: one huge value at the end', random: false },
];

export function makeSearchInput(n: number, kind: SearchInputKind, rng: Rng): SearchInput {
  if (kind === 'uniform') {
    const arr: number[] = [];
    for (let i = 0, v = 0; i < n; i++) arr.push((v += randInt(rng, 1, 21)));
    return { arr, target: arr[randInt(rng, 0, n)]! };
  }
  if (kind === 'skewed') {
    const arr = Array.from({ length: n }, (_, i) => (i === n - 1 && n > 1 ? n * n : i));
    return { arr, target: Math.max(0, n - 2) };
  }
  const arr = Array.from({ length: n }, (_, i) => 2 * i);
  const target = kind === 'worst' ? 2 * n + 1 : 2 * randInt(rng, 0, n);
  return { arr, target };
}

/** Snapshot shared by all searches so one view can draw any of them. */
export interface SearchSnapshot {
  /** Index being inspected. */
  i?: number;
  /** Remaining candidate range [lo, hi] (binary, jump and interpolation search). */
  lo?: number;
  hi?: number;
  found?: number;
}
