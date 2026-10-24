import type { Rng } from '../../engine/rng';
import { clauseStatus, randomKSat } from '../sat/cnf';
import type { Assignment, Cnf } from '../sat/cnf';

export type Quantifier = 'E' | 'A';

/**
 * A fully quantified formula Q₁x₁ Q₂x₂ … Qₙxₙ φ, φ in CNF over x₁..xₙ.
 * `prefix[i − 1]` quantifies variable i, outermost first.
 */
export interface Qbf {
  prefix: Quantifier[];
  cnf: Cnf;
}

/**
 * `alternating`: ∀∃∀… over a random 3-CNF, a game between the two quantifiers.
 * `exists-unsat`: every quantifier ∃ over an unsatisfiable φ, i.e. a SAT instance whose answer is no.
 * `forall-taut`: every quantifier ∀ over a tautology. Neither of the last two can short-circuit,
 * so the whole game tree is evaluated.
 */
export type QbfKind = 'alternating' | 'exists-unsat' | 'forall-taut';

export const QBF_KINDS: { id: QbfKind; label: string; random?: boolean }[] = [
  { id: 'alternating', label: '∀∃∀… over random 3-CNF', random: true },
  { id: 'exists-unsat', label: 'All ∃, unsatisfiable (SAT, answer no)' },
  { id: 'forall-taut', label: 'All ∀, a tautology' },
];

/** Clauses per variable for `alternating`: true 35–50 % of the time for n from 10 to 16 (∀ refutes denser formulas at once). */
export const ALTERNATING_RATIO = 0.5;

export const SYMBOL: Record<Quantifier, string> = { E: '∃', A: '∀' };

export function makeQbfInput(n: number, kind: QbfKind, rng: Rng): Qbf {
  switch (kind) {
    case 'alternating':
      return {
        prefix: Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 'A' : 'E')),
        cnf: randomKSat(n, ALTERNATING_RATIO, 3, rng),
      };
    case 'exists-unsat':
      // (x₁ ∨ … ∨ xₙ) ∧ ¬x₁ ∧ … ∧ ¬xₙ: some variable must be true, and none may be.
      return {
        prefix: Array<Quantifier>(n).fill('E'),
        cnf: { n, clauses: [Array.from({ length: n }, (_, i) => i + 1), ...Array.from({ length: n }, (_, i) => [-(i + 1)])] },
      };
    case 'forall-taut':
      // (x₁ ∨ ¬x₁): true whatever the assignment.
      return { prefix: Array<Quantifier>(n).fill('A'), cnf: { n, clauses: [[1, -1]] } };
  }
}

/** Uninstrumented reference: the value of the formula, by recursion over the prefix. */
export function qbfValue({ prefix, cnf }: Qbf): boolean {
  const a: Assignment = Array(cnf.n + 1).fill(0);
  const go = (i: number): boolean => {
    if (i > cnf.n) return cnf.clauses.every((c) => clauseStatus(c, a) === 'satisfied');
    const vals = [-1, 1].map((v) => {
      a[i] = v;
      return go(i + 1);
    });
    a[i] = 0;
    return prefix[i - 1] === 'E' ? vals.some(Boolean) : vals.every(Boolean);
  };
  return go(1);
}

/** The formula as text, e.g. "∀x₁ ∃x₂ . (x₁ ∨ ¬x₂) ∧ (x₂)". */
export function formatQbf({ prefix, cnf }: Qbf): string {
  const sub = (k: number) => String(k).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)]!);
  const lit = (l: number) => `${l < 0 ? '¬' : ''}x${sub(Math.abs(l))}`;
  const q = prefix.map((p, i) => `${SYMBOL[p]}x${sub(i + 1)}`).join(' ');
  return `${q} . ${cnf.clauses.map((c) => `(${c.map(lit).join(' ∨ ')})`).join(' ∧ ')}`;
}

/** The node being evaluated: variable i (n + 1 at a leaf) and the assignment so far, as bits. */
export interface QbfSnapshot {
  i?: number;
  bits?: string;
  /** Table: the level being folded (n at the leaves, 0 at the root). */
  level?: number;
}
