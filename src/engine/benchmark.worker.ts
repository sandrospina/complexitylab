import { benchmark, sweep } from './benchmark-core';
import type { BenchmarkPoint, BenchmarkRequest, SweepPoint, SweepRequest } from './benchmark-core';

export type WorkerRequest = ({ type: 'benchmark' } & BenchmarkRequest) | ({ type: 'sweep' } & SweepRequest);

export type WorkerMessage =
  | { type: 'point'; point: BenchmarkPoint }
  | { type: 'sweepPoint'; point: SweepPoint }
  | { type: 'done' }
  | { type: 'error'; message: string };

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const post = (m: WorkerMessage) => self.postMessage(m);
  try {
    if (e.data.type === 'sweep') for (const point of sweep(e.data)) post({ type: 'sweepPoint', point });
    else for (const point of benchmark(e.data)) post({ type: 'point', point });
    post({ type: 'done' });
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
