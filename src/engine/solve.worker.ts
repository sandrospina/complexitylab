import { findAlgorithm } from '../modules/registry';
import type { Budget, Counters } from './instrument';
import { runCount } from './runner';

export interface SolveRequest {
  algoId: string;
  input: unknown;
  budget?: Budget;
}

export interface SolveResponse {
  result: unknown;
  counters: Counters;
  truncated: boolean;
  /** Set if the run threw something other than a budget overrun. */
  error?: string;
}

/** Large enough for every capped UI instance; exponential runs past it report `truncated`. */
export const DEFAULT_SOLVE_BUDGET: Budget = { maxOps: 2e8, maxMs: 8000 };

self.onmessage = (e: MessageEvent<SolveRequest>) => {
  const { algoId, input, budget = DEFAULT_SOLVE_BUDGET } = e.data;
  try {
    const run = runCount(findAlgorithm(algoId).generator, input, { budget });
    self.postMessage({ result: run.result, counters: run.counters, truncated: run.truncated } satisfies SolveResponse);
  } catch (err) {
    self.postMessage({ result: undefined, counters: undefined, truncated: false, error: String(err) });
  }
};
