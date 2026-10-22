import { useEffect, useState } from 'react';
import { solveInWorker } from '../engine/solve';
import type { SolveResponse } from '../engine/solve.worker';

export type Solve<R> =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; result: R | undefined; ops: number; peakMem: number; truncated: boolean };

/**
 * The full solve of `input` by `algoId`, computed off the main thread and redone whenever
 * either changes. `input: undefined` means "don't run" (e.g. too large for this algorithm).
 */
export function useSolve<R>(algoId: string, input: unknown): Solve<R> {
  // The finished solve and what it was for; anything else in flight reads as 'running'.
  const [done, setDone] = useState<{ algoId: string; input: unknown; solve: Solve<R> } | undefined>();
  useEffect(() => {
    if (input === undefined) return;
    return solveInWorker({ algoId, input }, (r: SolveResponse) =>
      setDone({
        algoId,
        input,
        solve: r.error
          ? { status: 'idle' }
          : { status: 'done', result: r.result as R, ops: r.counters.totalOps, peakMem: r.counters.peakMem, truncated: r.truncated },
      }),
    );
  }, [algoId, input]);
  if (input === undefined) return { status: 'idle' };
  return done && done.algoId === algoId && done.input === input ? done.solve : { status: 'running' };
}
