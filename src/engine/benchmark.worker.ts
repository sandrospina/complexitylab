import { benchmark } from './benchmark-core';
import type { BenchmarkPoint, BenchmarkRequest } from './benchmark-core';

export type WorkerMessage =
  | { type: 'point'; point: BenchmarkPoint }
  | { type: 'done' }
  | { type: 'error'; message: string };

self.onmessage = (e: MessageEvent<BenchmarkRequest>) => {
  const post = (m: WorkerMessage) => self.postMessage(m);
  try {
    for (const point of benchmark(e.data)) post({ type: 'point', point });
    post({ type: 'done' });
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
