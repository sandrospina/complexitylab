import { findAlgorithm } from '../modules/registry';
import type { Budget } from './instrument';
import { mulberry32 } from './rng';
import { runCount } from './runner';

export interface BenchmarkRequest {
  algoId: string;
  nValues: number[];
  inputKind: string;
  /** Passed to the spec's makeInput, e.g. the average degree of a random graph. */
  param?: number;
  seed: number;
  /** Applied per n. */
  budget?: Budget;
}

export interface BenchmarkPoint {
  algoId: string;
  n: number;
  /** The spec's metric: one op kind, or the total of all counted ops. */
  ops: number;
  peakMem: number;
  peakStack: number;
  truncated: boolean;
}

export const DEFAULT_BENCH_BUDGET: Budget = { maxOps: 5e7, maxMs: 2000 };
/**
 * Random input kinds average up to this many trials per n, so average-case curves are not
 * one noisy sample. Trials stop early past TRIAL_OPS, where a single large run is already stable.
 */
export const RANDOM_TRIALS = 8;
const TRIAL_OPS = 2e6;

/**
 * Runs the algorithm in count mode for each n (capped at the spec's maxBenchN).
 * Stops after the first n that hits the budget, since larger n would too.
 */
export function* benchmark(req: BenchmarkRequest): Generator<BenchmarkPoint> {
  const spec = findAlgorithm(req.algoId);
  const budget = req.budget ?? DEFAULT_BENCH_BUDGET;
  const kind = spec.inputKinds.find((k) => k.id === req.inputKind);
  if (kind?.aggregate === 'median') {
    yield* medianBenchmark(req, kind.trials ?? MEDIAN_TRIALS);
    return;
  }
  const trials = kind?.random ? RANDOM_TRIALS : 1;
  for (const n of req.nValues) {
    if (n > spec.maxBenchN) break;
    const rng = mulberry32(req.seed + n);
    let ops = 0;
    let peakMem = 0;
    let peakStack = 0;
    let truncated = false;
    let t = 0;
    for (; t < trials && !truncated && (t === 0 || ops < TRIAL_OPS); t++) {
      const run = runCount(spec.generator, spec.makeInput(n, req.inputKind, rng, req.param), { budget });
      const c = run.counters;
      ops += spec.metric === 'total' ? c.totalOps : c.ops[spec.metric];
      peakMem = Math.max(peakMem, c.peakMem);
      peakStack = Math.max(peakStack, c.peakStack);
      truncated = run.truncated;
    }
    yield { algoId: req.algoId, n, ops: ops / t, peakMem, peakStack, truncated };
    if (truncated) break;
  }
}

export const MEDIAN_TRIALS = 64;

/**
 * For heavy-tailed costs (a few random inputs cost orders of magnitude more), the median of
 * many trials. A trial that hits the budget counts as infinitely expensive, so the point is
 * only truncated once half the trials are.
 */
function* medianBenchmark(req: BenchmarkRequest, trials: number): Generator<BenchmarkPoint> {
  const spec = findAlgorithm(req.algoId);
  const budget = req.budget ?? DEFAULT_BENCH_BUDGET;
  for (const n of req.nValues) {
    if (n > spec.maxBenchN) break;
    const rng = mulberry32(req.seed + n);
    const ys: number[] = [];
    let peakMem = 0;
    let peakStack = 0;
    for (let t = 0; t < trials; t++) {
      const run = runCount(spec.generator, spec.makeInput(n, req.inputKind, rng, req.param), { budget });
      const c = run.counters;
      ys.push(run.truncated ? Infinity : spec.metric === 'total' ? c.totalOps : c.ops[spec.metric]);
      peakMem = Math.max(peakMem, c.peakMem);
      peakStack = Math.max(peakStack, c.peakStack);
    }
    ys.sort((a, b) => a - b);
    const median = (ys[(trials - 1) >> 1]! + ys[trials >> 1]!) / 2;
    const truncated = !Number.isFinite(median);
    yield { algoId: req.algoId, n, ops: truncated ? 0 : median, peakMem, peakStack, truncated };
    if (truncated) break;
  }
}
