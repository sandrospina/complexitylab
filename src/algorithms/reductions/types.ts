import type { Instrument } from '../../engine/instrument';
import type { Algorithm } from '../../engine/runner';
import type { Cnf } from '../sat/cnf';

/** A part of the original instance: what a variable is about, or what a clause constrains. */
export interface Ref {
  kind: 'vertex' | 'edge' | 'cell' | 'gate' | 'wire' | 'slot' | 'position';
  id: number;
}

export interface Family {
  id: string;
  label: string;
}

export interface Encoding {
  cnf: Cnf;
  /** For variable v (1-based), at index v − 1: what it means. */
  vars: { label: string; refs: Ref[] }[];
  /** For each clause: the family it belongs to and the parts of the instance it mentions. */
  origins: { family: string; refs: Ref[] }[];
  /** Clauses emitted per family (0 for an omitted family). */
  counts: Record<string, number>;
}

/** The encoder's input: the instance and the clause families to leave out (break-it mode). */
export interface ReductionInput<I> {
  instance: I;
  omit: string[];
}

export interface Violation {
  /** The clause family whose constraint the solution breaks. */
  family: string;
  message: string;
  refs: Ref[];
}

export interface Reduction<I, S> {
  id: string;
  name: string;
  families: Family[];
  /** Instrumented: one write per clause emitted, one alloc per variable. */
  encode: Algorithm<ReductionInput<I>, Encoding>;
  /** Reads a model (a list of ±v) back as a solution of the original problem. */
  decode: (instance: I, model: number[]) => S;
  /** Everything wrong with a solution; empty means it solves the instance. */
  verify: (instance: I, solution: S) => Violation[];
  /** Uninstrumented exhaustive search, the reference the encoding is tested against. */
  brute: (instance: I) => S | undefined;
  /** The closed-form number of variables and of clauses in each family. */
  size: (instance: I) => { vars: number; families: Record<string, number> };
}

/**
 * Collects variables and clauses with their origins, skipping omitted families. Encoders
 * write `yield* b.clause(...)`, so each clause is one counted write.
 */
export class CnfBuilder {
  readonly vars: Encoding['vars'] = [];
  readonly clauses: number[][] = [];
  readonly origins: Encoding['origins'] = [];
  readonly counts: Record<string, number>;
  private readonly omit: Set<string>;

  constructor(
    private readonly ins: Instrument,
    families: Family[],
    omit: string[],
  ) {
    this.omit = new Set(omit);
    this.counts = Object.fromEntries(families.map((f) => [f.id, 0]));
  }

  /** Declares the next variable; returns its number (1-based). */
  variable(label: string, refs: Ref[]): number {
    this.vars.push({ label, refs });
    return this.vars.length;
  }

  *declare(count: number) {
    yield this.ins.alloc(count, { label: 'variables' });
  }

  *clause(family: string, lits: number[], refs: Ref[]) {
    if (this.omit.has(family)) return;
    this.clauses.push(lits);
    this.origins.push({ family, refs });
    this.counts[family] = (this.counts[family] ?? 0) + 1;
    yield this.ins.write({ label: family });
  }

  /** "Exactly one of" as one at-least-one clause and pairwise at-most-one clauses. */
  *exactlyOne(atLeast: string, atMost: string, lits: number[], refs: Ref[]) {
    yield* this.clause(atLeast, lits, refs);
    for (let i = 0; i < lits.length; i++)
      for (let j = i + 1; j < lits.length; j++) yield* this.clause(atMost, [-lits[i]!, -lits[j]!], refs);
  }

  result(): Encoding {
    return { cnf: { n: this.vars.length, clauses: this.clauses }, vars: this.vars, origins: this.origins, counts: this.counts };
  }
}

export const choose2 = (n: number) => (n * (n - 1)) / 2;

/** The model as a truth lookup: value(v) for variable v. */
export function modelValue(model: number[]): (v: number) => boolean {
  const truth = new Set(model.filter((l) => l > 0));
  return (v) => truth.has(v);
}
