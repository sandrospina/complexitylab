import type { Rng } from '../../engine/rng';
import { randInt } from '../../engine/rng';

export interface SortInput {
  arr: number[];
  /** Seeds the random pivot choice; ignored by deterministic sorts. */
  seed: number;
}

export type SortInputKind = 'random' | 'sorted' | 'reversed' | 'fewUnique' | 'runs';

/** The `runs` kind: a random permutation cut into this many sorted runs. */
export const RUNS = 8;

export const SORT_INPUT_KINDS: { id: SortInputKind; label: string; random?: boolean }[] = [
  { id: 'random', label: 'Random permutation', random: true },
  { id: 'sorted', label: 'Already sorted' },
  { id: 'reversed', label: 'Reversed' },
  { id: 'fewUnique', label: 'Few unique values (1–4)', random: true },
  { id: 'runs', label: `${RUNS} sorted runs`, random: true },
];

export function shuffle<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export function makeSortInput(n: number, kind: SortInputKind, rng: Rng): SortInput {
  const asc = Array.from({ length: n }, (_, i) => i + 1);
  if (kind === 'runs') {
    const perm = shuffle(asc, rng);
    const size = Math.ceil(n / RUNS);
    const arr = Array.from({ length: RUNS }, (_, r) => perm.slice(r * size, (r + 1) * size).sort((x, y) => x - y)).flat();
    return { arr, seed: randInt(rng, 0, 2 ** 31) };
  }
  const arr =
    kind === 'sorted'
      ? asc
      : kind === 'reversed'
        ? asc.reverse()
        : kind === 'fewUnique'
          ? asc.map(() => randInt(rng, 1, 5))
          : shuffle(asc, rng);
  return { arr, seed: randInt(rng, 0, 2 ** 31) };
}

/** Small per-event snapshot: the subarray being worked on and the pivot position. */
export interface SortSnapshot {
  lo?: number;
  hi?: number;
  pivot?: number;
}
