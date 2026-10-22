import type { BenchmarkPoint, BenchmarkRequest, SweepPoint, SweepRequest } from './benchmark-core';
import type { WorkerMessage, WorkerRequest } from './benchmark.worker';

export interface BenchmarkHandlers {
  onPoint: (p: BenchmarkPoint) => void;
  onDone: () => void;
  onError?: (message: string) => void;
}

/** Runs a benchmark in a dedicated Web Worker. Returns a cancel function. */
export function runBenchmark(req: BenchmarkRequest, h: BenchmarkHandlers): () => void {
  const worker = new Worker(new URL('./benchmark.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
    const m = e.data;
    if (m.type === 'point') h.onPoint(m.point);
    else {
      if (m.type === 'error') h.onError?.(m.message);
      worker.terminate();
      h.onDone();
    }
  };
  worker.postMessage({ type: 'benchmark', ...req } satisfies WorkerRequest);
  return () => worker.terminate();
}

/** Runs parameter sweeps in parallel workers, one per request. */
export function runSweeps(reqs: SweepRequest[], onPoint: (p: SweepPoint) => void, onAllDone: () => void): () => void {
  let pending = reqs.length;
  const workers = reqs.map((req) => {
    const worker = new Worker(new URL('./benchmark.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const m = e.data;
      if (m.type === 'sweepPoint') onPoint(m.point);
      else if (m.type === 'done' || m.type === 'error') {
        worker.terminate();
        if (--pending === 0) onAllDone();
      }
    };
    worker.postMessage({ type: 'sweep', ...req } satisfies WorkerRequest);
    return worker;
  });
  return () => workers.forEach((w) => w.terminate());
}

export const powersOfTwo = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => 2 ** (from + i));

/** Runs several benchmarks in parallel workers; `onAllDone` fires once every one has finished. */
export function runBenchmarks(
  reqs: BenchmarkRequest[],
  onPoint: (p: BenchmarkPoint) => void,
  onAllDone: () => void,
): () => void {
  let pending = reqs.length;
  const cancels = reqs.map((req) =>
    runBenchmark(req, {
      onPoint,
      onDone: () => {
        if (--pending === 0) onAllDone();
      },
    }),
  );
  return () => cancels.forEach((c) => c());
}
