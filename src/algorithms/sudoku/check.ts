import type { Instrument } from '../../engine/instrument';
import type { Algorithm } from '../../engine/runner';
import { side } from './board';
import type { Board, SudokuSnapshot } from './board';

export interface CheckResult {
  valid: boolean;
  /** The first cell found blank or repeated in its unit. */
  cell?: number;
}

/**
 * Checks a filled board: each of the 3s units (rows, columns, boxes) must hold 1..s once.
 * A seen array stamped with the unit number avoids clearing it between units, so every
 * cell costs one read, one compare and one write per unit: Θ(s²).
 */
export const checkSudoku: Algorithm<Board, CheckResult> = function* (b, ins: Instrument) {
  const s = side(b);
  const seen = Array<number>(s + 1).fill(-1);
  yield ins.alloc<SudokuSnapshot>(s + 1, { label: 'seen', line: 1 });
  const units: [string, (k: number) => number][] = [];
  for (let u = 0; u < s; u++) {
    units.push([`row ${u + 1}`, (k) => u * s + k]);
    units.push([`column ${u + 1}`, (k) => k * s + u]);
    const br = Math.floor(u / b.r) * b.r;
    const bc = (u % b.r) * b.c;
    units.push([`box ${u + 1}`, (k) => (br + Math.floor(k / b.c)) * s + bc + (k % b.c)]);
  }
  let result: CheckResult = { valid: true };
  outer: for (let u = 0; u < units.length; u++) {
    ins.at(2);
    const [unit, cellAt] = units[u]!;
    for (let k = 0; k < s; k++) {
      const cell = cellAt(k);
      const v = b.cells[cell]!;
      yield ins.read<SudokuSnapshot>({ indices: [cell], snapshot: { cell, unit }, line: 3 });
      yield ins.compare<SudokuSnapshot>({ indices: [cell], label: 'seen?', snapshot: { cell, unit }, line: 4 });
      if (v < 1 || v > s || seen[v] === u) {
        result = { valid: false, cell };
        yield ins.mark<SudokuSnapshot>(v === 0 ? 'blank cell' : `repeated ${v}`, { snapshot: { cell, unit } });
        break outer;
      }
      seen[v] = u;
      yield ins.write<SudokuSnapshot>({ label: 'mark seen', snapshot: { cell, unit }, line: 5 });
    }
  }
  if (result.valid) ins.at(6);
  yield ins.free<SudokuSnapshot>(s + 1, { label: 'seen' });
  return result;
};
