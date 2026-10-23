import type { ComplexityClass } from '../engine/complexity';

/** One pseudocode line. Its number is its position (from 1); the running code tags events with it. */
export interface PseudoLine {
  code: string;
  /** Indentation level. */
  depth: number;
  /** What the step does and why, in a sentence or two. */
  note: string;
  /** The line's cost per execution, in TeX (c₁, c₂, …). */
  cost?: string;
  /** How many times it runs in the worst case, in TeX. */
  times?: string;
  /** For lines that stand for a whole phase: what the count counts (e.g. "compares and moves"). */
  unit?: string;
  /** A procedure header shown above this line, e.g. "PARTITION(A, p, r)". */
  section?: string;
}

export interface Derivation {
  label: string;
  /** The cost summed over the lines, in TeX. */
  tex: string;
  text: string;
}

export interface Pseudocode {
  title: string;
  idea: string;
  lines: PseudoLine[];
  /** Lines whose counts decide the growth class. */
  dominant: number[];
  /** What the dominant lines grow as in the worst case. */
  bound: ComplexityClass;
  derivation: Derivation[];
  /** TypeScript files (under src/algorithms/) that run this algorithm. */
  sources: string[];
}
