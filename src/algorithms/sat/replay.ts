import type { TraceStep } from '../../engine/runner';
import type { Assignment } from './cnf';
import type { SatSnapshot } from './input';

export interface TrailEntry {
  lit: number;
  level: number;
  /** 'decision', or why it was forced: "unit: clause 3", "pure literal". */
  reason: string;
}

/** DPLL's assignment and trail after `upTo` steps, from decide/propagate events and backtrack marks. */
export function replayDpll(n: number, steps: TraceStep[], upTo: number): { a: Assignment; trail: TrailEntry[] } {
  const a: Assignment = Array(n + 1).fill(0);
  let trail: TrailEntry[] = [];
  for (const { event: e } of steps.slice(0, upTo)) {
    const level = (e.snapshot as SatSnapshot | undefined)?.level ?? 0;
    if ((e.op === 'decide' || e.op === 'propagate') && e.indices) {
      const v = e.indices[0]!;
      a[v] = e.value as number;
      trail.push({ lit: v * (e.value as number), level, reason: e.op === 'decide' ? 'decision' : (e.label ?? '') });
    } else if (e.op === 'mark' && e.label === 'backtrack' && e.indices) {
      const undone = new Set(e.indices);
      for (const v of undone) a[v] = 0;
      trail = trail.filter((t) => !undone.has(Math.abs(t.lit)));
    }
  }
  return { a, trail };
}

/** The truth table's current row, rows finished, and how often each clause was the first to fail. */
export function replayTruthTable(m: number, steps: TraceStep[], upTo: number): { row: number; rows: number; fails: number[] } {
  const fails = Array<number>(m).fill(0);
  let row = -1;
  let rows = 0;
  for (const { event: e } of steps.slice(0, upTo)) {
    if (e.op === 'write') {
      row = (e.snapshot as SatSnapshot).row!;
      rows++;
    } else if (e.op === 'mark' && e.label === 'falsified') fails[e.indices![0]!]!++;
  }
  return { row, rows, fails };
}

/** The assignment of truth-table row r: variable v is bit v − 1. */
export const rowAssignment = (n: number, row: number): Assignment =>
  [0, ...Array.from({ length: n }, (_, i) => (row >= 0 && Math.floor(row / 2 ** i) % 2 ? 1 : row >= 0 ? -1 : 0))];
