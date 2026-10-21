import type { TraceStep } from '../../engine/runner';

/** The array after the first `upTo` steps, rebuilt from swap and write events. */
export function replayArray(initial: number[], steps: TraceStep[], upTo: number): number[] {
  const a = initial.slice();
  for (let s = 0; s < Math.min(upTo, steps.length); s++) {
    const e = steps[s]!.event;
    const [i, j] = e.indices ?? [];
    if (e.op === 'swap' && i !== undefined && j !== undefined) [a[i], a[j]] = [a[j]!, a[i]!];
    else if (e.op === 'write' && i !== undefined) a[i] = e.value as number;
  }
  return a;
}
