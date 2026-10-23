import { useMemo } from 'react';
import { addInput, wireCount, wireName } from '../../algorithms/reductions/circuit';
import type { GateType } from '../../algorithms/reductions/circuit';
import { CELL_SYMBOLS, cookLevin, startRow, symbolText } from '../../algorithms/reductions/cook-levin';
import type { Tableau } from '../../algorithms/reductions/cook-levin';
import { sudoku } from '../../algorithms/reductions/sudoku';
import type { Filling } from '../../algorithms/reductions/sudoku';
import { tseitin } from '../../algorithms/reductions/tseitin';
import type { WireValues } from '../../algorithms/reductions/tseitin';
import type { Board } from '../../algorithms/sudoku/board';
import { MAX_WIRES, useReductionsStore } from '../../store/reductions';
import { makePuzzle, SIZES } from '../../store/verify';
import type { Size } from '../../store/verify';
import { SudokuGrid } from '../../views/SudokuGrid';
import { CircuitView } from './CircuitView';
import { Pipeline } from './Pipeline';

const ids = (refs: { kind: string; id: number }[], kind: string) => new Set(refs.filter((r) => r.kind === kind).map((r) => r.id));

export function SudokuTab() {
  const { size, seed, omit } = useReductionsStore();
  const { setPuzzle, setOmit } = useReductionsStore.getState();
  const puzzle = useMemo(() => makePuzzle(size, seed).puzzle, [size, seed]);
  return (
    <div className="stack">
      <section className="panel controls" aria-label="Puzzle">
        <label>
          Board
          <select value={size} onChange={(e) => setPuzzle(e.target.value as Size, seed)}>
            {SIZES.map((z) => (
              <option key={z} value={z}>
                {z} × {z}
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => setPuzzle(size, seed + 1)}>New puzzle</button>
        <span className="muted">The same puzzles as the verify-vs-solve page.</span>
      </section>
      <Pipeline
        reduction={sudoku}
        instance={puzzle}
        omit={omit}
        setOmit={setOmit}
        noSolution="the puzzle has no solution"
        solutionName="grid"
        size={puzzle.cells.length}
        draw={({ solution, violations, lit, onHover }) => {
          const f = solution as Filling | undefined;
          const board: Board = { ...puzzle, cells: f ? f.map((ds, i) => (ds.length === 1 ? ds[0]! : puzzle.cells[i]!)) : puzzle.cells };
          return (
            <SudokuGrid
              board={board}
              givens={puzzle.cells}
              highlight={ids(lit, 'cell')}
              bad={new Set(violations.flatMap((v) => [...ids(v.refs, 'cell')]))}
              onHover={(cell) => onHover(cell === undefined ? undefined : { kind: 'cell', id: cell })}
            />
          );
        }}
      />
    </div>
  );
}

const GATE_TYPES: GateType[] = ['and', 'or', 'xor', 'not'];

export function CircuitTab() {
  const { circuit: c, omit } = useReductionsStore();
  const { setCircuit, setOmit } = useReductionsStore.getState();
  const wires = Array.from({ length: wireCount(c) }, (_, w) => w);
  const full = wireCount(c) >= MAX_WIRES;
  return (
    <div className="stack">
      <section className="panel stack" aria-label="Circuit editor">
        <div className="controls">
          <button onClick={() => setCircuit(addInput(c))} disabled={full}>
            Add input
          </button>
          {GATE_TYPES.map((type) => (
            <button
              key={type}
              disabled={full}
              onClick={() => setCircuit({ ...c, gates: [...c.gates, { type, a: wireCount(c) - 1, b: Math.max(0, wireCount(c) - 2) }], output: wireCount(c) })}
            >
              Add {type.toUpperCase()}
            </button>
          ))}
          <button onClick={() => setCircuit({ ...c, gates: c.gates.slice(0, -1), output: Math.min(c.output, wireCount(c) - 2) })} disabled={c.gates.length === 0}>
            Remove last gate
          </button>
          <label>
            Output
            <select value={c.output} onChange={(e) => setCircuit({ ...c, output: Number(e.target.value) })}>
              {wires.map((w) => (
                <option key={w} value={w}>
                  {wireName(c, w)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="gate-rows">
          {c.gates.map((g, k) => {
            const set = (patch: Partial<typeof g>) => setCircuit({ ...c, gates: c.gates.map((x, j) => (j === k ? { ...x, ...patch } : x)) });
            const earlier = wires.slice(0, c.inputs + k);
            return (
              <span key={k} className="gate-row">
                <span className="mono">{wireName(c, c.inputs + k)} =</span>
                <select value={g.type} onChange={(e) => set({ type: e.target.value as GateType })} aria-label={`Gate ${k + 1} type`}>
                  {GATE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.toUpperCase()}
                    </option>
                  ))}
                </select>
                {(g.type === 'not' ? (['a'] as const) : (['a', 'b'] as const)).map((side) => (
                  <select key={side} value={g[side]} onChange={(e) => set({ [side]: Number(e.target.value) })} aria-label={`Gate ${k + 1} input ${side === 'a' ? 1 : 2}`}>
                    {earlier.map((w) => (
                      <option key={w} value={w}>
                        {wireName(c, w)}
                      </option>
                    ))}
                  </select>
                ))}
              </span>
            );
          })}
        </div>
      </section>
      <Pipeline
        reduction={tseitin}
        instance={c}
        omit={omit}
        setOmit={setOmit}
        noSolution="no inputs make the output true"
        solutionName="input assignment"
        size={c.gates.length}
        draw={({ solution, violations, lit, onHover }) => {
          const values = solution as WireValues | undefined;
          return (
            <div className="stack" style={{ gap: 6 }}>
              <CircuitView circuit={c} values={values} lit={lit} bad={new Set(violations.flatMap((v) => [...ids(v.refs, 'gate')]))} onHover={onHover} />
              {values && (
                <span className="mono" data-testid="circuit-inputs">
                  inputs: {values.slice(0, c.inputs).map((v, i) => `${wireName(c, i)}=${v ? 1 : 0}`).join(', ')}
                </span>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}

export function CookTab() {
  const { machine: run, omit } = useReductionsStore();
  const { setMachine, setOmit } = useReductionsStore.getState();
  const { input: tape, T: steps } = run;
  const L = tape.length + 1;
  return (
    <div className="stack">
      <section className="panel stack" aria-label="Machine">
        <p style={{ margin: 0 }}>
          A tiny machine: its head starts on the left in state <em>scan</em>, flips every bit while moving right, and
          <em> accepts</em> when it reaches the blank. Writing down its whole run as a time × tape table, the{' '}
          <strong>tableau</strong>, turns &ldquo;the machine accepts within T steps&rdquo; into clauses: one symbol per
          cell, row 0 is the input, each row follows from the one above, and some cell accepts. Cook and Levin showed
          this works for any machine that checks a certificate in polynomial time, which is why SAT was the first
          NP-complete problem.
        </p>
        <div className="controls">
          <span>Input</span>
          {tape.map((b, i) => (
            <button key={i} className="mono" onClick={() => setMachine({ input: tape.map((x, j) => (j === i ? 1 - x : x)), T: steps })} aria-label={`Input bit ${i + 1}: ${b}`}>
              {b}
            </button>
          ))}
          <button onClick={() => setMachine({ input: [...tape, 0], T: steps })} disabled={tape.length >= 6}>
            + bit
          </button>
          <button onClick={() => setMachine({ input: tape.slice(0, -1), T: steps })} disabled={tape.length <= 1}>
            − bit
          </button>
          <label>
            Steps T = <span className="mono">{steps}</span>
            <input type="range" min={0} max={10} value={steps} onChange={(e) => setMachine({ input: tape, T: Number(e.target.value) })} aria-label="Steps T" />
          </label>
          <span className="muted">It needs {tape.length + 1} steps to accept.</span>
        </div>
      </section>
      <Pipeline
        reduction={cookLevin}
        instance={run}
        omit={omit}
        setOmit={setOmit}
        noSolution={`the machine does not accept within ${steps} steps`}
        solutionName="run"
        size={Math.max(1, steps)}
        draw={({ solution, lit, onHover }) => {
          const tab = (solution as Tableau | undefined) ?? [startRow(run)];
          const litCells = ids(lit, 'cell');
          return (
            <table className="tableau" aria-label="Tableau">
              <thead>
                <tr>
                  <th scope="col">t</th>
                  {Array.from({ length: L }, (_, i) => (
                    <th key={i} scope="col">
                      cell {i}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tab.map((row, t) => (
                  <tr key={t}>
                    <th scope="row">{t}</th>
                    {row.map((s, i) => (
                      <td
                        key={i}
                        className={`${s >= 3 ? (s >= 6 ? 'accept' : 'head') : ''}${litCells.has(t * L + i) ? ' lit' : ''}`}
                        onMouseEnter={() => onHover({ kind: 'cell', id: t * L + i })}
                        onMouseLeave={() => onHover(undefined)}
                      >
                        {s < 0 ? '?' : symbolText(s)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        }}
      />
      <p className="muted" style={{ margin: 0 }}>
        {CELL_SYMBOLS} possible symbols per cell; the clauses grow linearly in T for this fixed tape, and polynomially in
        general. Before solving, only row 0 is shown.
      </p>
    </div>
  );
}
