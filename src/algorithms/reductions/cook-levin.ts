import { CnfBuilder, choose2, modelValue } from './types';
import type { Ref, Reduction, Violation } from './types';

/**
 * A toy machine for the Cook–Levin teaser. Its tape holds the input bits and one blank; the
 * head starts on cell 0 in state "scan", flips each bit while moving right, and switches to
 * "accept" (and stays) on the blank. So it accepts after len + 1 steps.
 */
export interface MachineRun {
  input: number[];
  /** Rows 0..T of the tableau. */
  T: number;
}

/** Cell contents: a tape symbol (0, 1, blank), alone or under the head in a state. */
export const SYMBOLS = ['0', '1', '_'] as const;
const PLAIN = 0;
const SCAN = 3;
const ACCEPT = 6;
export const CELL_SYMBOLS = 9;

export const symbolText = (s: number) => {
  const tape = SYMBOLS[s % 3]!;
  return s < SCAN ? tape : s < ACCEPT ? `scan ${tape}` : `accept ${tape}`;
};

/** What a cell holds next, from itself and its left neighbour (−1 at the left edge). */
export function nextSymbol(left: number, mid: number): number {
  const tape = mid % 3;
  if (mid >= ACCEPT) return mid;
  if (mid >= SCAN) return tape === 2 ? ACCEPT + 2 : PLAIN + (1 - tape);
  // The head moves right onto this cell after flipping a bit on its left.
  if (left >= SCAN && left < ACCEPT && left % 3 !== 2) return SCAN + tape;
  return mid;
}

const cells = (r: MachineRun) => r.input.length + 1;
/** Row 0 of the tableau: the input, with the head on cell 0 in state scan. */
export const startRow = (r: MachineRun) => [...r.input.map((b, i) => (i === 0 ? SCAN + b : PLAIN + b)), r.input.length === 0 ? SCAN + 2 : PLAIN + 2];

/** The tableau: rows of cell symbols. */
export type Tableau = number[][];

const cellRef = (r: MachineRun, t: number, i: number): Ref => ({ kind: 'cell', id: t * cells(r) + i });

/**
 * "This machine accepts this input within T steps" → SAT. x(t, i, s): at time t, cell i
 * holds s. Each cell holds one symbol; row 0 is the input; each cell follows from the row
 * above by the machine's rule; and an accepting cell appears somewhere. The satisfying
 * assignment is the run itself.
 */
export const cookLevin: Reduction<MachineRun, Tableau> = {
  id: 'cook-levin',
  name: 'Cook–Levin tableau',
  families: [
    { id: 'one-symbol', label: 'every cell holds exactly one symbol' },
    { id: 'start', label: 'row 0 is the input, head on cell 0' },
    { id: 'step', label: 'each row follows from the one above' },
    { id: 'accept', label: 'the machine accepts at some time' },
  ],
  encode: function* ({ instance: r, omit }, ins) {
    const L = cells(r);
    const b = new CnfBuilder(ins, cookLevin.families, omit);
    const x = (t: number, i: number, s: number) => (t * L + i) * CELL_SYMBOLS + s + 1;
    for (let t = 0; t <= r.T; t++)
      for (let i = 0; i < L; i++)
        for (let s = 0; s < CELL_SYMBOLS; s++) b.variable(`t${t},c${i}=${symbolText(s)}`, [cellRef(r, t, i)]);
    yield* b.declare((r.T + 1) * L * CELL_SYMBOLS);
    for (let t = 0; t <= r.T; t++)
      for (let i = 0; i < L; i++)
        yield* b.exactlyOne('one-symbol', 'one-symbol', Array.from({ length: CELL_SYMBOLS }, (_, s) => x(t, i, s)), [cellRef(r, t, i)]);
    for (const [i, s] of startRow(r).entries()) yield* b.clause('start', [x(0, i, s)], [cellRef(r, 0, i)]);
    for (let t = 0; t < r.T; t++)
      for (let i = 0; i < L; i++)
        for (let l = i === 0 ? -1 : 0; l < (i === 0 ? 0 : CELL_SYMBOLS); l++)
          for (let m = 0; m < CELL_SYMBOLS; m++) {
            const lits = [...(l >= 0 ? [-x(t, i - 1, l)] : []), -x(t, i, m), x(t + 1, i, nextSymbol(l, m))];
            const refs = [cellRef(r, t + 1, i), cellRef(r, t, i), ...(l >= 0 ? [cellRef(r, t, i - 1)] : [])];
            yield* b.clause('step', lits, refs);
          }
    const accepting: number[] = [];
    for (let t = 0; t <= r.T; t++) for (let i = 0; i < L; i++) for (let s = ACCEPT; s < CELL_SYMBOLS; s++) accepting.push(x(t, i, s));
    yield* b.clause('accept', accepting, []);
    return b.result();
  },
  decode: (r, model) => {
    const L = cells(r);
    const t = modelValue(model);
    return Array.from({ length: r.T + 1 }, (_, row) =>
      Array.from({ length: L }, (_, i) => {
        const found = Array.from({ length: CELL_SYMBOLS }, (_, s) => s).filter((s) => t((row * L + i) * CELL_SYMBOLS + s + 1));
        return found.length === 1 ? found[0]! : -1;
      }),
    );
  },
  verify: (r, tab) => {
    const out: Violation[] = [];
    tab.forEach((row, t) =>
      row.forEach((s, i) => {
        if (s < 0) out.push({ family: 'one-symbol', message: `time ${t}, cell ${i} does not hold exactly one symbol`, refs: [cellRef(r, t, i)] });
      }),
    );
    startRow(r).forEach((s, i) => {
      if (tab[0]![i] !== s) out.push({ family: 'start', message: `cell ${i} at time 0 should be ${symbolText(s)}`, refs: [cellRef(r, 0, i)] });
    });
    for (let t = 0; t < r.T; t++)
      for (let i = 0; i < cells(r); i++) {
        const want = nextSymbol(i === 0 ? -1 : tab[t]![i - 1]!, tab[t]![i]!);
        if (tab[t]![i]! >= 0 && tab[t + 1]![i] !== want)
          out.push({ family: 'step', message: `time ${t + 1}, cell ${i} should be ${symbolText(want)}`, refs: [cellRef(r, t + 1, i)] });
      }
    if (!tab.some((row) => row.some((s) => s >= ACCEPT))) out.push({ family: 'accept', message: 'the machine never accepts', refs: [] });
    return out;
  },
  brute: (r) => {
    const tab: Tableau = [startRow(r)];
    for (let t = 0; t < r.T; t++) tab.push(tab[t]!.map((m, i) => nextSymbol(i === 0 ? -1 : tab[t]![i - 1]!, m)));
    return tab.some((row) => row.some((s) => s >= ACCEPT)) ? tab : undefined;
  },
  size: (r) => {
    const L = cells(r);
    return {
      vars: (r.T + 1) * L * CELL_SYMBOLS,
      families: {
        'one-symbol': (r.T + 1) * L * (1 + choose2(CELL_SYMBOLS)),
        start: L,
        step: r.T * (CELL_SYMBOLS + (L - 1) * CELL_SYMBOLS * CELL_SYMBOLS),
        accept: 1,
      },
    };
  },
};
