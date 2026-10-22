import type { SolveRequest, SolveResponse } from './solve.worker';

/**
 * Runs one algorithm to completion in a dedicated Web Worker, so exponential solves never
 * block the page. Returns a cancel function that terminates the worker.
 */
export function solveInWorker(req: SolveRequest, onDone: (r: SolveResponse) => void): () => void {
  const worker = new Worker(new URL('./solve.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent<SolveResponse>) => {
    worker.terminate();
    onDone(e.data);
  };
  worker.postMessage(req);
  return () => worker.terminate();
}
