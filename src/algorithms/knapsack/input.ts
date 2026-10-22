import { mulberry32, randInt } from '../../engine/rng';
import type { Rng } from '../../engine/rng';

export interface KnapsackInput {
  /** Item weights and values. */
  w: number[];
  v: number[];
  /** Capacity. */
  W: number;
}

export interface KnapsackResult {
  best: number;
  /** Indices of the chosen items. */
  items: number[];
}

/**
 * `items`: n items and W = 8n, so W grows with n. `bits`: a fixed 10 items and W = 2ⁿ − 1,
 * so n counts the bits needed to write W down: the input grows by one digit, W doubles.
 */
export type KnapsackKind = 'items' | 'bits';

export const BITS_ITEMS = 10;

export function makeKnapsackInput(n: number, kind: KnapsackKind, rng: Rng): KnapsackInput {
  const count = kind === 'items' ? n : BITS_ITEMS;
  const W = kind === 'items' ? 8 * n : 2 ** n - 1;
  const w = Array.from({ length: count }, () => randInt(rng, 1, Math.max(2, Math.floor(W / 2)) + 1));
  const v = Array.from({ length: count }, () => randInt(rng, 1, 101));
  return { w, v, W };
}

/**
 * n items whose weights are fixed fractions of W = 2ᵇ − 1, so adding a bit to W keeps the
 * same instance at twice the resolution: the answer barely moves, the DP table doubles.
 */
export function scaledInstance(n: number, bits: number, seed: number): KnapsackInput {
  const rng = mulberry32(seed);
  const W = 2 ** bits - 1;
  const fractions = Array.from({ length: n }, () => 0.08 + rng() * 0.4);
  const v = Array.from({ length: n }, () => randInt(rng, 1, 51));
  return { w: fractions.map((f) => Math.max(1, Math.round(f * W))), v, W };
}

/** Brute force: the subset's weight and value so far and the best value. DP: the cell being filled. */
export interface KnapsackSnapshot {
  weight?: number;
  value?: number;
  best?: number;
  i?: number;
  c?: number;
}
