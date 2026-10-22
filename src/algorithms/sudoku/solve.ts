import type { Instrument } from '../../engine/instrument';
import type { Algorithm } from '../../engine/runner';
import { peers, side } from './board';
import type { Board, SudokuSnapshot } from './board';

/**
 * Plain backtracking: blanks in row-major order, values tried ascending, each placement
 * checked against the cell's peers. Recursion is one level per blank, so it is simulated
 * with an explicit stack; each level is a frame. Returns the solved board, or undefined.
 */
export const solveSudoku: Algorithm<Board, Board | undefined> = function* (b, ins: Instrument) {
  const s = side(b);
  const cells = b.cells.slice();
  yield ins.alloc<SudokuSnapshot>(cells.length, { label: 'board' });
  const nbrs = peers(b);
  const blanks = cells.flatMap((v, i) => (v === 0 ? [i] : []));
  // tried[d]: the last value tried at the d-th blank (0: none yet).
  const tried = Array<number>(blanks.length).fill(0);
  let d = 0;
  if (blanks.length > 0) yield ins.pushFrame<SudokuSnapshot>({ label: `cell ${blanks[0]}`, snapshot: { cell: blanks[0] } });

  while (d >= 0 && d < blanks.length) {
    const cell = blanks[d]!;
    let placed = false;
    for (let v = tried[d]! + 1; v <= s && !placed; v++) {
      tried[d] = v;
      let ok = true;
      for (const p of nbrs[cell]!) {
        yield ins.compare<SudokuSnapshot>({ indices: [p], label: `${v} clashes?`, snapshot: { cell } });
        if (cells[p] === v) {
          ok = false;
          break;
        }
      }
      if (ok) {
        cells[cell] = v;
        yield ins.write<SudokuSnapshot>({ indices: [cell], value: v, snapshot: { cell } });
        placed = true;
      }
    }
    if (placed) {
      d++;
      if (d < blanks.length) yield ins.pushFrame<SudokuSnapshot>({ label: `cell ${blanks[d]}`, snapshot: { cell: blanks[d] } });
    } else {
      // Every value clashes: give up this cell and revise the previous one.
      tried[d] = 0;
      yield ins.popFrame();
      d--;
      if (d >= 0) {
        const prev = blanks[d]!;
        cells[prev] = 0;
        yield ins.write<SudokuSnapshot>({ indices: [prev], value: 0, label: 'backtrack', snapshot: { cell: prev } });
      }
    }
  }
  for (let k = 0; k < Math.min(d, blanks.length); k++) yield ins.popFrame();
  yield ins.free<SudokuSnapshot>(cells.length, { label: 'board' });
  return d < 0 ? undefined : { ...b, cells };
};
