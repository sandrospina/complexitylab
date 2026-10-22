import type { Rng } from '../../engine/rng';
import { randomKSat } from './cnf';
import type { Cnf } from './cnf';

export type Heuristic = 'first' | 'moms' | 'jw';

export interface SatInput {
  cnf: Cnf;
  /** DPLL only: how to pick the next decision variable. */
  heuristic: Heuristic;
  /** DPLL only: unit propagation; without it (and pure literals) DPLL is plain backtracking. */
  propagate: boolean;
  pure: boolean;
}

export type SatKind = 'unsat' | 'threshold';

/** Clause/variable ratios: far above the threshold (almost surely unsatisfiable), and at it. */
export const KIND_RATIO: Record<SatKind, number> = { unsat: 10, threshold: 4.26 };

export const makeSatInput =
  (opts: Omit<SatInput, 'cnf'>) =>
  (n: number, kind: SatKind, rng: Rng, ratio?: number): SatInput => ({
    cnf: randomKSat(n, ratio ?? KIND_RATIO[kind], 3, rng),
    ...opts,
  });

export interface SatSnapshot {
  /** Truth table: the row being evaluated, its bits being the assignment. */
  row?: number;
  /** Decision level (DPLL). */
  level?: number;
}

/** A model as a list of ±v, or undefined when unsatisfiable. */
export type SatResult = number[] | undefined;
