import { randInt } from '../../engine/rng';
import type { Rng } from '../../engine/rng';
import { shuffle } from '../sort/input';

export interface SubsetSumInput {
  nums: number[];
  target: number;
}

/** A claimed solution: indices into `nums` whose values sum to `target`. */
export interface Certificate extends SubsetSumInput {
  cert: number[];
}

/** `none`: even numbers and an odd target, so no subset works and search must try them all. */
export type SolveKind = 'none';
/** `valid`: a random subset of about half the numbers and its sum as the target. */
export type VerifyKind = 'valid';

const evens = (n: number, rng: Rng) => Array.from({ length: n }, () => 2 * randInt(rng, 1, 50));

export function makeSolveInput(n: number, _kind: SolveKind, rng: Rng): SubsetSumInput {
  const nums = evens(n, rng);
  return { nums, target: 2 * Math.floor(nums.reduce((s, x) => s + x, 0) / 4) + 1 };
}

export function makeVerifyInput(n: number, _kind: VerifyKind, rng: Rng): Certificate {
  const nums = evens(n, rng);
  const cert = shuffle(Array.from({ length: n }, (_, i) => i), rng).slice(0, Math.ceil(n / 2));
  return { nums, target: cert.reduce((s, i) => s + nums[i]!, 0), cert };
}

export interface SubsetSumSnapshot {
  sum?: number;
}
