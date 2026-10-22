import { runCount } from '../../engine/runner';
import { side } from '../sudoku/board';
import type { Board } from '../sudoku/board';
import { solveSudoku } from '../sudoku/solve';
import { choose2, CnfBuilder, modelValue } from './types';
import type { Ref, Reduction, Violation } from './types';

/** For each cell, the digits its variables make true. */
export type Filling = number[][];

const cellRef = (i: number): Ref => ({ kind: 'cell', id: i });

/** The cells of every row, column and box, with a name for messages. */
function units(b: Board): { family: 'row' | 'col' | 'box'; name: string; cells: number[] }[] {
  const s = side(b);
  const out: { family: 'row' | 'col' | 'box'; name: string; cells: number[] }[] = [];
  for (let u = 0; u < s; u++) {
    out.push({ family: 'row', name: `row ${u + 1}`, cells: Array.from({ length: s }, (_, k) => u * s + k) });
    out.push({ family: 'col', name: `column ${u + 1}`, cells: Array.from({ length: s }, (_, k) => k * s + u) });
    const br = Math.floor(u / b.r) * b.r;
    const bc = (u % b.r) * b.c;
    out.push({ family: 'box', name: `box ${u + 1}`, cells: Array.from({ length: s }, (_, k) => (br + Math.floor(k / b.c)) * s + bc + (k % b.c)) });
  }
  return out;
}

/**
 * (Generalised) Sudoku → SAT. x(cell, d): the cell holds digit d. Each cell holds exactly
 * one digit, no digit repeats in a row, column or box, and the givens are unit clauses.
 * s³ variables and O(s⁴) clauses; for 9 × 9, 729 and 11,745 plus the givens.
 */
export const sudoku: Reduction<Board, Filling> = {
  id: 'sudoku',
  name: 'Sudoku',
  families: [
    { id: 'cell-digit', label: 'every cell holds a digit' },
    { id: 'cell-one', label: 'no cell holds two digits' },
    { id: 'row', label: 'no digit twice in a row' },
    { id: 'col', label: 'no digit twice in a column' },
    { id: 'box', label: 'no digit twice in a box' },
    { id: 'givens', label: 'the givens' },
  ],
  encode: function* ({ instance: b, omit }, ins) {
    const s = side(b);
    const B = new CnfBuilder(ins, sudoku.families, omit);
    const x = (i: number, d: number) => i * s + d;
    for (let i = 0; i < s * s; i++)
      for (let d = 1; d <= s; d++) B.variable(`x${i},${d}: row ${Math.floor(i / s) + 1}, column ${(i % s) + 1} holds ${d}`, [cellRef(i)]);
    yield* B.declare(s * s * s);
    for (let i = 0; i < s * s; i++)
      yield* B.exactlyOne('cell-digit', 'cell-one', Array.from({ length: s }, (_, d) => x(i, d + 1)), [cellRef(i)]);
    for (const u of units(b))
      for (let d = 1; d <= s; d++)
        for (let p = 0; p < s; p++)
          for (let q = p + 1; q < s; q++)
            yield* B.clause(u.family, [-x(u.cells[p]!, d), -x(u.cells[q]!, d)], [cellRef(u.cells[p]!), cellRef(u.cells[q]!)]);
    for (let i = 0; i < s * s; i++) if (b.cells[i]) yield* B.clause('givens', [x(i, b.cells[i]!)], [cellRef(i)]);
    return B.result();
  },
  decode: (b, model) => {
    const s = side(b);
    const t = modelValue(model);
    return Array.from({ length: s * s }, (_, i) => Array.from({ length: s }, (_, d) => d + 1).filter((d) => t(i * s + d)));
  },
  verify: (b, f) => {
    const out: Violation[] = [];
    f.forEach((ds, i) => {
      if (ds.length === 0) out.push({ family: 'cell-digit', message: `cell ${i + 1} is empty`, refs: [cellRef(i)] });
      if (ds.length > 1) out.push({ family: 'cell-one', message: `cell ${i + 1} holds ${ds.join(' and ')}`, refs: [cellRef(i)] });
      if (b.cells[i] && !ds.includes(b.cells[i]!))
        out.push({ family: 'givens', message: `cell ${i + 1} should be the given ${b.cells[i]}`, refs: [cellRef(i)] });
    });
    for (const u of units(b)) {
      const at = new Map<number, number>();
      for (const i of u.cells)
        for (const d of f[i]!) {
          const prev = at.get(d);
          if (prev !== undefined) out.push({ family: u.family, message: `${d} twice in ${u.name}`, refs: [cellRef(prev), cellRef(i)] });
          else at.set(d, i);
        }
    }
    return out;
  },
  brute: (b) => {
    const solved = runCount(solveSudoku, b).result;
    return solved?.cells.map((d) => [d]);
  },
  size: (b) => {
    const s = side(b);
    const unit = s * s * choose2(s);
    return {
      vars: s ** 3,
      families: { 'cell-digit': s * s, 'cell-one': s * s * choose2(s), row: unit, col: unit, box: unit, givens: b.cells.filter(Boolean).length },
    };
  },
};
