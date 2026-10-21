import type { TraceStep } from '../../engine/runner';

export interface GraphState {
  /** Visited (traversals) or settled (Dijkstra). */
  done: boolean[];
  /** Queue, stack or heap entries, oldest first. */
  frontier: number[];
  /** Tentative distances (Dijkstra only). */
  dist: (number | undefined)[];
}

/**
 * Graph state after the first `upTo` steps, rebuilt from the events so that algorithms need
 * not copy their frontier into every snapshot: 'mark visited'/'settle' writes, 'dist' writes,
 * and one-cell alloc/free of a vertex for frontier entries.
 */
export function replayGraph(n: number, steps: TraceStep[], upTo: number): GraphState {
  const s: GraphState = { done: Array<boolean>(n).fill(false), frontier: [], dist: Array(n).fill(undefined) };
  for (let i = 0; i < Math.min(upTo, steps.length); i++) {
    const e = steps[i]!.event;
    const v = e.indices?.[0];
    if (v === undefined) continue;
    if (e.op === 'write') {
      if (e.label === 'dist') s.dist[v] = e.value as number;
      else if (e.label === 'mark visited' || e.label === 'settle') s.done[v] = true;
    } else if (e.op === 'alloc' && e.cells === 1) s.frontier.push(v);
    else if (e.op === 'free' && e.cells === 1) {
      // A queue gives up its oldest entry, a stack its newest; the heap may hold duplicates.
      const at = e.label === 'dequeue' ? s.frontier.indexOf(v) : s.frontier.lastIndexOf(v);
      if (at >= 0) s.frontier.splice(at, 1);
    }
  }
  return s;
}
