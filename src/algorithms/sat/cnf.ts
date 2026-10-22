import { randInt } from '../../engine/rng';
import type { Rng } from '../../engine/rng';

/**
 * A formula in conjunctive normal form over variables 1..n. Literals follow DIMACS: v is
 * the variable, −v its negation. A clause is a disjunction of literals; the formula is the
 * conjunction of its clauses.
 */
export interface Cnf {
  n: number;
  clauses: number[][];
}

/** Variable v's value, indexed from 1: 1 true, −1 false, 0 unassigned. */
export type Assignment = number[];

export type ClauseStatus = 'satisfied' | 'falsified' | 'unit' | 'open';

export const litValue = (a: Assignment, lit: number) => Math.sign(lit) * (a[Math.abs(lit)] ?? 0);

/** Satisfied: some literal true. Falsified: all false. Unit: one unassigned, rest false. */
export function clauseStatus(clause: number[], a: Assignment): ClauseStatus {
  let open = 0;
  for (const lit of clause) {
    const v = litValue(a, lit);
    if (v > 0) return 'satisfied';
    if (v === 0) open++;
  }
  return open === 0 ? 'falsified' : open === 1 ? 'unit' : 'open';
}

/** Whether a model (a list of ±v, or an assignment array) satisfies every clause. */
export function satisfies(cnf: Cnf, model: number[]): boolean {
  const a: Assignment = Array(cnf.n + 1).fill(0);
  for (const lit of model) a[Math.abs(lit)] = Math.sign(lit);
  return cnf.clauses.every((c) => clauseStatus(c, a) === 'satisfied');
}

export class DimacsError extends Error {
  constructor(
    readonly line: number,
    message: string,
  ) {
    super(`line ${line}: ${message}`);
  }
}

/** Parses DIMACS CNF: `c` comments, a `p cnf <vars> <clauses>` header, clauses ended by 0. */
export function parseDimacs(text: string): Cnf {
  let n: number | undefined;
  let expected = 0;
  const clauses: number[][] = [];
  let current: number[] = [];
  let lastLine = 0;
  text.split('\n').forEach((raw, i) => {
    const line = raw.trim();
    lastLine = i + 1;
    if (line === '' || line.startsWith('c') || line.startsWith('%')) return;
    if (line.startsWith('p')) {
      const m = /^p\s+cnf\s+(\d+)\s+(\d+)$/.exec(line);
      if (!m) throw new DimacsError(i + 1, 'expected "p cnf <variables> <clauses>"');
      if (n !== undefined) throw new DimacsError(i + 1, 'second header');
      n = Number(m[1]);
      expected = Number(m[2]);
      return;
    }
    if (n === undefined) throw new DimacsError(i + 1, 'clause before the "p cnf" header');
    for (const tok of line.split(/\s+/)) {
      const lit = Number(tok);
      if (!Number.isInteger(lit)) throw new DimacsError(i + 1, `"${tok}" is not a literal`);
      if (Math.abs(lit) > n) throw new DimacsError(i + 1, `variable ${Math.abs(lit)} is above ${n}`);
      if (lit === 0) {
        clauses.push(current);
        current = [];
      } else current.push(lit);
    }
  });
  if (n === undefined) throw new DimacsError(lastLine, 'no "p cnf" header');
  if (current.length > 0) clauses.push(current);
  if (clauses.length !== expected)
    throw new DimacsError(lastLine, `header says ${expected} clauses, found ${clauses.length}`);
  return { n, clauses };
}

export function toDimacs(cnf: Cnf): string {
  return [`p cnf ${cnf.n} ${cnf.clauses.length}`, ...cnf.clauses.map((c) => `${[...c, 0].join(' ')}`)].join('\n');
}

/** URL form: "n:1 -2 3,2 3,-1". */
export const encodeCnf = (cnf: Cnf) => `${cnf.n}:${cnf.clauses.map((c) => c.join(' ')).join(',')}`;

export function decodeCnf(raw: string | null, maxN: number): Cnf | undefined {
  const m = raw ? /^(\d+):(.*)$/.exec(raw) : null;
  if (!m) return undefined;
  const n = Number(m[1]);
  if (n < 1 || n > maxN) return undefined;
  const clauses = m[2] ? m[2].split(',').map((c) => (c.trim() ? c.trim().split(/\s+/).map(Number) : [])) : [];
  const ok = clauses.every((c) => c.every((l) => Number.isInteger(l) && l !== 0 && Math.abs(l) <= n));
  return ok ? { n, clauses } : undefined;
}

/** m = round(ratio · n) clauses of k distinct variables with random signs. */
export function randomKSat(n: number, ratio: number, k: number, rng: Rng): Cnf {
  const m = Math.round(ratio * n);
  const width = Math.min(k, n);
  const clauses = Array.from({ length: m }, () => {
    const vars = new Set<number>();
    while (vars.size < width) vars.add(randInt(rng, 1, n + 1));
    return [...vars].map((v) => (rng() < 0.5 ? -v : v));
  });
  return { n, clauses };
}

/**
 * Pigeonhole PHP(h, h−1): h pigeons in h−1 holes, one hole each. Unsatisfiable, and hard
 * for resolution-based solvers. Variable (p, j) means "pigeon p sits in hole j".
 */
export function pigeonhole(h: number): Cnf {
  const holes = h - 1;
  const x = (p: number, j: number) => p * holes + j + 1;
  const clauses: number[][] = [];
  for (let p = 0; p < h; p++) clauses.push(Array.from({ length: holes }, (_, j) => x(p, j)));
  for (let j = 0; j < holes; j++)
    for (let p = 0; p < h; p++) for (let q = p + 1; q < h; q++) clauses.push([-x(p, j), -x(q, j)]);
  return { n: h * holes, clauses };
}

export type PresetId = 'example' | 'core' | 'php3' | 'php4' | 'random';

export const PRESETS: { id: PresetId; label: string }[] = [
  { id: 'example', label: 'Small satisfiable example' },
  { id: 'core', label: 'Unsatisfiable, 3 variables' },
  { id: 'php3', label: 'Pigeonhole: 3 pigeons, 2 holes' },
  { id: 'php4', label: 'Pigeonhole: 4 pigeons, 3 holes' },
  { id: 'random', label: 'Random 3-SAT at ratio 4.26' },
];

export function makePreset(id: PresetId, rng: Rng): Cnf {
  switch (id) {
    case 'example':
      // (x1 ∨ ¬x2) ∧ (x2 ∨ x3) ∧ (¬x1 ∨ ¬x3 ∨ x4) ∧ (¬x4 ∨ x2) ∧ (¬x3 ∨ ¬x4)
      return { n: 4, clauses: [[1, -2], [2, 3], [-1, -3, 4], [-4, 2], [-3, -4]] };
    case 'core':
      // Every one of the 8 assignments falsifies exactly one clause.
      return {
        n: 3,
        clauses: [[1, 2, 3], [1, 2, -3], [1, -2, 3], [1, -2, -3], [-1, 2, 3], [-1, 2, -3], [-1, -2, 3], [-1, -2, -3]],
      };
    case 'php3':
      return pigeonhole(3);
    case 'php4':
      return pigeonhole(4);
    case 'random':
      return randomKSat(12, 4.26, 3, rng);
  }
}

/** Uninstrumented brute-force satisfiability, for tests. */
export function isSatisfiable(cnf: Cnf): boolean {
  for (let row = 0; row < 2 ** cnf.n; row++) {
    const model = Array.from({ length: cnf.n }, (_, i) => (row & (1 << i) ? i + 1 : -(i + 1)));
    if (satisfies(cnf, model)) return true;
  }
  return false;
}
