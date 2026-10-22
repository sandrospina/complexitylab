import { mulberry32, randInt } from '../../engine/rng';
import type { Rng } from '../../engine/rng';
import { shuffle } from '../sort/input';

/**
 * A generalised Sudoku: boxes of r rows × c columns, so the side is s = r·c and each row,
 * column and box holds 1..s once. Cells are row-major; 0 is blank.
 */
export interface Board {
  r: number;
  c: number;
  cells: number[];
}

export const side = (b: Pick<Board, 'r' | 'c'>) => b.r * b.c;

/** Box shapes for each supported side, as close to square as possible (r ≤ c). */
export const BOX_SHAPES: Record<number, [r: number, c: number]> = {
  4: [2, 2],
  6: [2, 3],
  8: [2, 4],
  9: [3, 3],
  10: [2, 5],
  12: [3, 4],
  15: [3, 5],
  16: [4, 4],
  20: [4, 5],
  25: [5, 5],
};

const order = (groups: number, size: number, rng: Rng) =>
  shuffle(Array.from({ length: groups }, (_, i) => i), rng).flatMap((g) =>
    shuffle(Array.from({ length: size }, (_, i) => g * size + i), rng),
  );

/**
 * A solved board from the standard pattern, scrambled by validity-preserving moves: rows
 * within bands, bands, columns within stacks, stacks, and digit relabelling.
 */
export function solvedBoard(r: number, c: number, rng: Rng): Board {
  const s = r * c;
  const rows = order(c, r, rng); // c bands of r rows
  const cols = order(r, c, rng); // r stacks of c columns
  const digits = shuffle(Array.from({ length: s }, (_, i) => i + 1), rng);
  const cells = Array.from({ length: s * s }, (_, i) => {
    const row = rows[Math.floor(i / s)]!;
    const col = cols[i % s]!;
    return digits[(c * (row % r) + Math.floor(row / r) + col) % s]!;
  });
  return { r, c, cells };
}

/** The board with `count` cells blanked in a random order. */
export function blank(b: Board, count: number, rng: Rng): Board {
  const cells = b.cells.slice();
  const order = shuffle(Array.from({ length: cells.length }, (_, i) => i), rng);
  for (const i of order.slice(0, count)) cells[i] = 0;
  return { ...b, cells };
}

/** The 3(s − 1) − overlap cells sharing a row, column or box with each cell. */
export function peers(b: Pick<Board, 'r' | 'c'>): number[][] {
  const s = side(b);
  return Array.from({ length: s * s }, (_, i) => {
    const row = Math.floor(i / s);
    const col = i % s;
    const br = row - (row % b.r);
    const bc = col - (col % b.c);
    const out = new Set<number>();
    for (let k = 0; k < s; k++) {
      out.add(row * s + k);
      out.add(k * s + col);
      out.add((br + Math.floor(k / b.c)) * s + bc + (k % b.c));
    }
    out.delete(i);
    return [...out];
  });
}

export type SudokuKind = 'side' | 'blanks';

/** Checker input: a solved board of side n, which a checker must read in full. */
export function makeCheckInput(n: number, _kind: SudokuKind, rng: Rng): Board {
  const [r, c] = BOX_SHAPES[n] ?? [3, 3];
  return solvedBoard(r, c, rng);
}

/** The fixed 9×9 the solver is measured on: only which cells are blank varies. */
export const SOLVER_BASE = solvedBoard(3, 3, mulberry32(9));

/** Solver input: n blank cells on the fixed 9×9. */
export function makeSolveInput(n: number, _kind: SudokuKind, rng: Rng): Board {
  return blank(SOLVER_BASE, n, mulberry32(randInt(rng, 0, 2 ** 31)));
}

/** The cell in focus and the unit being checked. */
export interface SudokuSnapshot {
  cell?: number;
  unit?: string;
}
