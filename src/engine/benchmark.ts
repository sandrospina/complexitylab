import type { BenchmarkPoint, BenchmarkRequest } from './benchmark-core';
import type { WorkerMessage } from './benchmark.worker';

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
  worker.postMessage(req);
  return () => worker.terminate();
}

export const powersOfTwo = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => 2 ** (from + i));
