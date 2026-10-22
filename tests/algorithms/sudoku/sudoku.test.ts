import { describe, expect, it } from 'vitest';
import { blank, BOX_SHAPES, makeSolveInput, peers, side, solvedBoard } from '../../../src/algorithms/sudoku/board';
import type { Board } from '../../../src/algorithms/sudoku/board';
import { checkSudoku } from '../../../src/algorithms/sudoku/check';
import { solveSudoku } from '../../../src/algorithms/sudoku/solve';
import { mulberry32 } from '../../../src/engine/rng';
import { runCount } from '../../../src/engine/runner';

/** Uninstrumented validity check. */
function valid(b: Board): boolean {
  const s = side(b);
  const units: number[][] = [];
  for (let u = 0; u < s; u++) {
    units.push(Array.from({ length: s }, (_, k) => u * s + k));
    units.push(Array.from({ length: s }, (_, k) => k * s + u));
    const br = Math.floor(u / b.r) * b.r;
    const bc = (u % b.r) * b.c;
    units.push(Array.from({ length: s }, (_, k) => (br + Math.floor(k / b.c)) * s + bc + (k % b.c)));
  }
  return units.every((cells) => new Set(cells.map((i) => b.cells[i])).size === s && cells.every((i) => b.cells[i]! >= 1));
}

const check = (b: Board) => runCount(checkSudoku, b).result!;

describe('generalised Sudoku', () => {
  it('generates valid solved boards for every box shape', () => {
    for (const [r, c] of Object.values(BOX_SHAPES))
      for (const seed of [1, 2, 3]) expect(valid(solvedBoard(r, c, mulberry32(seed)))).toBe(true);
  });

  it('every cell has the right number of peers', () => {
    // 2(s − 1) in its row and column, plus the rest of its box outside them.
    for (const [r, c] of [[2, 2], [2, 3], [3, 3]] as const) {
      const s = r * c;
      for (const ps of peers({ r, c })) expect(ps).toHaveLength(2 * (s - 1) + (r - 1) * (c - 1));
    }
  });

  it('the checker accepts solved boards and rejects every single-cell mutation', () => {
    for (const [r, c] of [[2, 2], [2, 3], [3, 3]] as const) {
      const b = solvedBoard(r, c, mulberry32(4));
      expect(check(b)).toEqual({ valid: true });
      const s = r * c;
      for (let i = 0; i < b.cells.length; i++) {
        for (const v of [0, (b.cells[i]! % s) + 1]) {
          const cells = b.cells.slice();
          cells[i] = v;
          expect(check({ ...b, cells }).valid).toBe(false);
        }
      }
    }
  });

  it('the checker costs 3 ops per cell per unit on a valid board', () => {
    for (const s of [4, 9, 16]) {
      const [r, c] = BOX_SHAPES[s]!;
      expect(runCount(checkSudoku, solvedBoard(r, c, mulberry32(1))).counters.totalOps).toBe(3 * 3 * s * s);
    }
  });

  it('the solver fills every blank with an answer the checker accepts', () => {
    for (const [r, c, blanks] of [[2, 2, 10], [2, 3, 20], [3, 3, 45]] as const) {
      for (const seed of [1, 2]) {
        const puzzle = blank(solvedBoard(r, c, mulberry32(seed)), blanks, mulberry32(seed + 10));
        const solved = runCount(solveSudoku, puzzle).result!;
        expect(check(solved)).toEqual({ valid: true });
        puzzle.cells.forEach((v, i) => v !== 0 && expect(solved.cells[i]).toBe(v));
      }
    }
  });

  it('the solver reports an unsolvable board and stops cleanly at its budget', () => {
    const b = solvedBoard(2, 2, mulberry32(1));
    const cells = b.cells.slice();
    // Row 0 becomes [_, _, a, c] for its original values [a, b, c, d]: b and d no longer fit its blanks' columns.
    cells[0] = 0;
    cells[1] = 0;
    cells[2] = b.cells[0]!;
    cells[3] = b.cells[2]!;
    expect(runCount(solveSudoku, { ...b, cells }).result).toBeUndefined();
    const hard = makeSolveInput(64, 'blanks', mulberry32(3));
    const r = runCount(solveSudoku, hard, { budget: { maxOps: 1e4 } });
    expect(r.truncated).toBe(true);
    expect(r.counters.stackDepth).toBeGreaterThan(0);
  });
});
