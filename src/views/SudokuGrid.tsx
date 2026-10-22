import { side } from '../algorithms/sudoku/board';
import type { Board } from '../algorithms/sudoku/board';

interface Props {
  board: Board;
  /** Non-zero cells here are givens, shown fixed. */
  givens: number[];
  /** The cell the trace is looking at. */
  focus?: number;
  /** Cells to emphasise, e.g. those a hovered clause mentions; `bad` ones are marked as wrong. */
  highlight?: Set<number>;
  bad?: Set<number>;
  /** Without it the grid is read-only. */
  onSet?: (i: number, v: number) => void;
  onHover?: (cell: number | undefined) => void;
}

/** An s × s Sudoku with box borders; blank cells are inputs when `onSet` is given. */
export function SudokuGrid({ board, givens, focus, highlight, bad, onSet, onHover }: Props) {
  const s = side(board);
  return (
    <div
      className="sudoku"
      style={{ gridTemplateColumns: `repeat(${s}, minmax(0, 1fr))`, maxWidth: s * 44 }}
      role="grid"
      aria-label={`${s} × ${s} Sudoku`}
    >
      {board.cells.map((v, i) => {
        const row = Math.floor(i / s);
        const col = i % s;
        const cls = [
          'sc',
          col % board.c === board.c - 1 && col < s - 1 ? 'box-right' : '',
          row % board.r === board.r - 1 && row < s - 1 ? 'box-bottom' : '',
          focus === i ? 'focus' : '',
          highlight?.has(i) ? 'lit' : '',
          bad?.has(i) ? 'bad' : '',
        ].join(' ');
        const label = `Row ${row + 1}, column ${col + 1}`;
        const hover = onHover && { onMouseEnter: () => onHover(i), onMouseLeave: () => onHover(undefined) };
        return givens[i] ? (
          <div key={i} role="gridcell" className={`${cls} given`} aria-label={`${label}, given ${v}`} {...hover}>
            {v}
          </div>
        ) : onSet ? (
          <input
            key={i}
            role="gridcell"
            className={cls}
            inputMode="numeric"
            maxLength={1}
            value={v || ''}
            aria-label={label}
            {...hover}
            onChange={(e) => {
              const d = Number(e.target.value.slice(-1));
              onSet(i, Number.isInteger(d) && d >= 1 && d <= s ? d : 0);
            }}
          />
        ) : (
          <div key={i} role="gridcell" className={cls} aria-label={`${label}, ${v || 'blank'}`} {...hover}>
            {v || ''}
          </div>
        );
      })}
    </div>
  );
}
