import type { Rng } from '../../engine/rng';

export type Point = [x: number, y: number];

export interface TspInput {
  pts: Point[];
}

export interface TspResult {
  cost: number;
  /** City order starting from city 0; the tour returns to it. */
  tour: number[];
}

export type TspKind = 'random';

/** n cities uniform in the unit square. */
export function makeTspInput(n: number, _kind: TspKind, rng: Rng): TspInput {
  return { pts: Array.from({ length: n }, () => [rng(), rng()] as Point) };
}

export const dist = (pts: Point[], a: number, b: number) =>
  Math.hypot(pts[a]![0] - pts[b]![0], pts[a]![1] - pts[b]![1]);

export function tourCost(pts: Point[], tour: number[]): number {
  let s = 0;
  for (let k = 0; k < tour.length; k++) s += dist(pts, tour[k]!, tour[(k + 1) % tour.length]!);
  return s;
}

/**
 * Tour positions change through indexed swaps and writes, so views replay the current tour
 * with `replayArray`. Snapshots carry the best tour so far, and Held–Karp's current subset.
 */
export interface TspSnapshot {
  best?: number;
  bestTour?: number[];
  /** Held–Karp: the subset of cities 1..n−1 (as a bitmask) and the last city of the path. */
  mask?: number;
  last?: number;
}
