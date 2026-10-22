import { describe, expect, it } from 'vitest';
import { fromEdges } from '../../../src/algorithms/graph/graph';
import type { Graph } from '../../../src/algorithms/graph/graph';
import { randomCircuit, EXAMPLE_CIRCUIT } from '../../../src/algorithms/reductions/circuit';
import type { Circuit } from '../../../src/algorithms/reductions/circuit';
import { clique } from '../../../src/algorithms/reductions/clique';
import { coloring } from '../../../src/algorithms/reductions/coloring';
import { cookLevin } from '../../../src/algorithms/reductions/cook-levin';
import { gnp } from '../../../src/algorithms/reductions/graph-util';
import { hamiltonian } from '../../../src/algorithms/reductions/hamiltonian';
import { sudoku } from '../../../src/algorithms/reductions/sudoku';
import { GRAPH_PRESETS, makeGraphPreset } from '../../../src/algorithms/reductions/presets';
import { tseitin } from '../../../src/algorithms/reductions/tseitin';
import type { Encoding, Reduction } from '../../../src/algorithms/reductions/types';
import { dpll } from '../../../src/algorithms/sat/dpll';
import { blank, solvedBoard } from '../../../src/algorithms/sudoku/board';
import type { Board } from '../../../src/algorithms/sudoku/board';
import { mulberry32 } from '../../../src/engine/rng';
import { runCount } from '../../../src/engine/runner';

const encode = <I, S>(r: Reduction<I, S>, instance: I, omit: string[] = []) =>
  runCount(r.encode, { instance, omit }).result as Encoding;
const solve = (e: Encoding) => runCount(dpll, { cnf: e.cnf, heuristic: 'jw', propagate: true, pure: false }).result;

/** The reduction's contract on one instance: same answer as brute force, valid decodes, exact sizes. */
function check<I, S>(r: Reduction<I, S>, instance: I) {
  const e = encode(r, instance);
  const model = solve(e);
  const reference = r.brute(instance);
  expect(model !== undefined).toBe(reference !== undefined);
  if (model) expect(r.verify(instance, r.decode(instance, model))).toEqual([]);
  if (reference) expect(r.verify(instance, reference)).toEqual([]);
  const size = r.size(instance);
  expect(e.cnf.n).toBe(size.vars);
  expect(e.counts).toEqual(size.families);
  expect(e.cnf.clauses.length).toBe(Object.values(size.families).reduce((a, b) => a + b, 0));
  expect(e.origins).toHaveLength(e.cnf.clauses.length);
  expect(e.vars).toHaveLength(e.cnf.n);
}

const special = (n: number): Graph[] => [
  fromEdges(n, []),
  fromEdges(n, Array.from({ length: n * n }, (_, k) => [Math.floor(k / n), k % n, 1] as [number, number, number]).filter(([u, v]) => u < v)),
  fromEdges(n, Array.from({ length: n }, (_, i) => [i, (i + 1) % n, 1] as [number, number, number]).filter(([u, v]) => u !== v && !(n === 2 && u > v))),
];
function graphs(): Graph[] {
  const rng = mulberry32(21);
  const out: Graph[] = [];
  for (let n = 1; n <= 7; n++) {
    out.push(...special(n));
    for (let k = 0; k < 8; k++) out.push(gnp(n, [0.3, 0.5, 0.8][k % 3]!, rng));
  }
  return out;
}

describe('reductions to SAT', () => {
  it('3-colouring agrees with brute force (odd cycles and K4 are not 3-colourable)', () => {
    for (const g of graphs()) check(coloring, g);
    expect(coloring.brute(special(4)[1]!)).toBeUndefined();
  });

  it('k-clique agrees with brute force for k = 1..4', () => {
    for (const g of graphs()) for (let k = 1; k <= 4; k++) check(clique, { g, k });
  });

  it('Hamiltonian cycle agrees with brute force', () => {
    for (const g of graphs()) check(hamiltonian, g);
  });

  it('Sudoku agrees with the backtracking solver on 4 × 4 and 6 × 6 puzzles', () => {
    for (const [r, c, blanks] of [[2, 2, 10], [2, 2, 16], [2, 3, 20]] as const)
      for (const seed of [1, 2, 3]) check(sudoku, blank(solvedBoard(r, c, mulberry32(seed)), blanks, mulberry32(seed + 9)));
    // Two equal givens in a row: no solution either way.
    const b = solvedBoard(2, 2, mulberry32(1));
    const bad: Board = { ...b, cells: b.cells.map((v, i) => (i === 1 ? b.cells[0]! : i < 4 ? v : 0)) };
    check(sudoku, bad);
    expect(sudoku.brute(bad)).toBeUndefined();
  });

  it('the 9 × 9 encoding has 729 variables and 11,745 clauses plus the givens', () => {
    const b = blank(solvedBoard(3, 3, mulberry32(4)), 45, mulberry32(5));
    const e = encode(sudoku, b);
    expect(e.cnf.n).toBe(729);
    expect(e.cnf.clauses.length).toBe(11_745 + 36);
  });

  it('Tseitin agrees with brute force, and every clause has at most 3 literals', () => {
    const rng = mulberry32(5);
    const circuits: Circuit[] = [EXAMPLE_CIRCUIT];
    for (let k = 0; k < 120; k++) circuits.push(randomCircuit(1 + (k % 8), rng));
    for (const c of circuits) {
      check(tseitin, c);
      expect(Math.max(...encode(tseitin, c).cnf.clauses.map((cl) => cl.length))).toBeLessThanOrEqual(3);
    }
  });

  it('Cook–Levin: satisfiable exactly when the machine accepts within T steps, and the model is its run', () => {
    for (const input of [[], [0], [1, 0], [1, 1, 0, 1]])
      for (let T = 0; T <= input.length + 3; T++) {
        const run = { input, T };
        check(cookLevin, run);
        expect(cookLevin.brute(run) !== undefined).toBe(T >= input.length + 1);
        const model = solve(encode(cookLevin, run));
        if (model) expect(cookLevin.decode(run, model)).toEqual(cookLevin.brute(run));
      }
  });

  it('the graph presets are what their labels say', () => {
    for (const p of GRAPH_PRESETS) {
      const g = makeGraphPreset(p.id);
      check(coloring, g);
      check(hamiltonian, g);
      check(clique, { g, k: 3 });
    }
    expect(coloring.brute(makeGraphPreset('k4'))).toBeUndefined();
    expect(coloring.brute(makeGraphPreset('wheel'))).toBeUndefined();
    expect(coloring.brute(makeGraphPreset('petersen'))).toBeDefined();
    expect(hamiltonian.brute(makeGraphPreset('petersen'))).toBeUndefined();
    expect(hamiltonian.brute(makeGraphPreset('cube'))).toBeDefined();
    expect(clique.brute({ g: makeGraphPreset('petersen'), k: 3 })).toBeUndefined();
  });

  it('verify rejects mutated solutions', () => {
    const g = fromEdges(4, [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 0, 1]]);
    const col = coloring.brute(g)!;
    expect(coloring.verify(g, col.map((cs, v) => (v === 1 ? col[0]! : cs)))[0]!.family).toBe('differ');
    expect(coloring.verify(g, col.map((cs, v) => (v === 2 ? [] : cs)))[0]!.family).toBe('has-colour');
    const tour = hamiltonian.brute(g)!;
    expect(hamiltonian.verify(g, [tour[0]!, tour[2]!, tour[1]!, tour[3]!]).some((v) => v.family === 'adjacent')).toBe(true);
    const wires = tseitin.brute(EXAMPLE_CIRCUIT)!;
    expect(tseitin.verify(EXAMPLE_CIRCUIT, wires.map((w, i) => (i === 3 ? !w : w)))[0]!.family).toBe('and');
  });

  it('break-it: without "adjacent vertices differ" the solver colours an edge badly, and verify names it', () => {
    const triangle = fromEdges(3, [[0, 1, 1], [1, 2, 1], [0, 2, 1]]);
    const e = encode(coloring, triangle, ['differ']);
    expect(e.counts.differ).toBe(0);
    // Force everything towards colour 1 with an extra unit clause per vertex, as a lazy solver might.
    const model = runCount(dpll, { cnf: { ...e.cnf, clauses: [...e.cnf.clauses, [1], [4], [7]] }, heuristic: 'first', propagate: true, pure: false }).result!;
    const violations = coloring.verify(triangle, coloring.decode(triangle, model));
    expect(violations.map((v) => v.family)).toEqual(['differ', 'differ', 'differ']);
    expect(violations[0]!.refs[0]!.kind).toBe('edge');
  });
});
