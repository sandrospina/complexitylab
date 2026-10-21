import { findAlgorithm } from '../modules/registry';
import type { Budget } from './instrument';
import { mulberry32 } from './rng';
import { runCount } from './runner';

export interface BenchmarkRequest {
  algoId: string;
  nValues: number[];
  inputKind: string;
  seed: number;
  /** Applied per n. */
  budget?: Budget;
}

export interface BenchmarkPoint {
  algoId: string;
  n: number;
  ops: number;
  peakMem: number;
  peakStack: number;
  truncated: boolean;
}

export const DEFAULT_BENCH_BUDGET: Budget = { maxOps: 5e7, maxMs: 2000 };

/**
 * Runs the algorithm in count mode for each n (capped at the spec's maxBenchN).
 * Stops after the first n that hits the budget, since larger n would too.
 */
export function* benchmark(req: BenchmarkRequest): Generator<BenchmarkPoint> {
  const spec = findAlgorithm(req.algoId);
  const budget = req.budget ?? DEFAULT_BENCH_BUDGET;
  for (const n of req.nValues) {
    if (n > spec.maxBenchN) break;
    const input = spec.makeInput(n, req.inputKind, mulberry32(req.seed + n));
    const { counters, truncated } = runCount(spec.generator, input, { budget });
    yield {
      algoId: req.algoId,
      n,
      ops: counters.totalOps,
      peakMem: counters.peakMem,
      peakStack: counters.peakStack,
      truncated,
    };
    if (truncated) break;
  }
}
