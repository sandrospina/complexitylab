import type { TraceEvent } from '../engine/events';
import { emptyCounters } from '../engine/instrument';
import type { Counters } from '../engine/instrument';
import type { TraceResult } from '../engine/runner';

export interface Frame<S = unknown> {
  /** Number of events applied: 0 is the initial state. Clamped to the trace length. */
  step: number;
  event?: TraceEvent;
  counters: Counters;
  /** The most recent snapshot any event carried. */
  snapshot?: S;
}

/** The state of a trace after `step` events. Shorter traces in a race stay on their last frame. */
export function frameAt<S>(trace: TraceResult<unknown>, step: number): Frame<S> {
  const idx = Math.max(0, Math.min(step, trace.steps.length));
  let snapshot: S | undefined;
  for (let i = idx - 1; i >= 0; i--) {
    const snap = trace.steps[i]!.event.snapshot;
    if (snap !== undefined) {
      snapshot = snap as S;
      break;
    }
  }
  const last = trace.steps[idx - 1];
  return { step: idx, event: last?.event, counters: last?.counters ?? emptyCounters(), snapshot };
}
