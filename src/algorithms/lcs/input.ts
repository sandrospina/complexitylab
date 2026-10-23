import { randInt } from '../../engine/rng';
import type { Rng } from '../../engine/rng';

export interface LcsInput {
  a: string;
  b: string;
}

export interface LcsResult {
  length: number;
  /** The subsequence itself, when the algorithm can recover it. */
  lcs?: string;
}

/** `random`: two random DNA strings. `similar`: b is a with about one letter in six changed. `different`: no letter in common. */
export type LcsKind = 'random' | 'similar' | 'different';

export const LCS_KINDS: { id: LcsKind; label: string; random?: boolean }[] = [
  { id: 'random', label: 'Two random DNA strings', random: true },
  { id: 'similar', label: 'One a mutation of the other', random: true },
  { id: 'different', label: 'No letters in common', random: true },
];

const DNA = 'ACGT';
const pick = (rng: Rng, letters: string) => letters[randInt(rng, 0, letters.length)]!;
const word = (n: number, rng: Rng, letters = DNA) => Array.from({ length: n }, () => pick(rng, letters)).join('');

/** Two strings of length n each. */
export function makeLcsInput(n: number, kind: LcsKind, rng: Rng): LcsInput {
  if (kind === 'different') return { a: word(n, rng, 'AC'), b: word(n, rng, 'GT') };
  const a = word(n, rng);
  if (kind === 'random') return { a, b: word(n, rng) };
  return { a, b: [...a].map((c) => (rng() < 1 / 6 ? pick(rng, DNA) : c)).join('') };
}

/** Uninstrumented reference length, for tests. */
export function lcsLength(a: string, b: string): number {
  let prev = Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const cur = [0];
    for (let j = 1; j <= b.length; j++) cur.push(a[i - 1] === b[j - 1] ? prev[j - 1]! + 1 : Math.max(prev[j]!, cur[j - 1]!));
    prev = cur;
  }
  return prev[b.length]!;
}

export const isSubsequence = (s: string, of: string) => {
  let k = 0;
  for (const c of of) if (k < s.length && c === s[k]) k++;
  return k === s.length;
};

/** The cell being filled, the subproblem a[aLo, aHi) × b[bLo, bHi) (Hirschberg), and matched positions. */
export interface LcsSnapshot {
  i?: number;
  j?: number;
  aLo?: number;
  aHi?: number;
  bLo?: number;
  bHi?: number;
}
