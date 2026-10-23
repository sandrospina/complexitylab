import { randInt } from '../../engine/rng';
import type { Rng } from '../../engine/rng';
import { shuffle } from '../sort/input';

/**
 * The sequence x₀, f(x₀), f(f(x₀)), … over n values: a tail of μ values, then a loop of λ
 * (μ + λ = n), the shape of the letter ρ. Values are shuffled labels, so nothing about a
 * value says where it sits: finding the repeat needs either memory or a trick.
 */
export interface CycleInput {
  /** f as a table: next[v] = f(v). */
  next: number[];
  start: number;
}

export interface CycleResult {
  /** Tail length: index of the first value that repeats. */
  mu: number;
  /** Loop length. */
  lambda: number;
}

export type CycleKind = 'balanced' | 'tail' | 'loop' | 'random';

export const CYCLE_KINDS: { id: CycleKind; label: string; random?: boolean }[] = [
  { id: 'balanced', label: 'Tail and loop of equal length', random: true },
  { id: 'tail', label: 'Long tail, loop of 1', random: true },
  { id: 'loop', label: 'All loop, no tail', random: true },
  { id: 'random', label: 'Random split', random: true },
];

/** The ρ with tail μ and loop λ; `order[i]` is the i-th value of the sequence. */
export function makeRho(mu: number, lambda: number, rng: Rng): CycleInput & { order: number[] } {
  const n = mu + lambda;
  const order = shuffle(Array.from({ length: n }, (_, i) => i), rng);
  const next = Array<number>(n);
  for (let i = 0; i < n; i++) next[order[i]!] = order[i + 1 < n ? i + 1 : mu]!;
  return { next, start: order[0]!, order };
}

export function splitFor(n: number, kind: CycleKind, rng: Rng): [mu: number, lambda: number] {
  const size = Math.max(1, n);
  if (kind === 'tail') return [size - 1, 1];
  if (kind === 'loop') return [0, size];
  const mu = kind === 'balanced' ? Math.floor(size / 2) : randInt(rng, 0, size);
  return [mu, size - mu];
}

export function makeCycleInput(n: number, kind: CycleKind, rng: Rng): CycleInput {
  const [mu, lambda] = splitFor(n, kind, rng);
  const { next, start } = makeRho(mu, lambda, rng);
  return { next, start };
}

/** Where the pointers are (Floyd), or the value just looked up (hash set), and the phase. */
export interface CycleSnapshot {
  tortoise?: number;
  hare?: number;
  at?: number;
  phase?: string;
}
