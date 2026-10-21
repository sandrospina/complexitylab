import type { TraceEvent } from './events';
import { BudgetExceeded, Instrument, cloneCounters } from './instrument';
import type { Budget, Counters } from './instrument';

/** The algorithm contract: a generator that yields events and returns its result. */
export type Algorithm<I, R> = (input: I, ins: Instrument) => Generator<TraceEvent, R, void>;

export interface TraceStep {
  event: TraceEvent;
  /** Counters immediately after this event. */
  counters: Counters;
}

export interface RunOptions {
  budget?: Budget;
}

export interface TraceOptions extends RunOptions {
  /** Stop storing (and running) after this many steps. Animations only need small inputs. */
  maxSteps?: number;
}

export interface TraceResult<R> {
  steps: TraceStep[];
  result: R | undefined;
  counters: Counters;
  truncated: boolean;
}

export interface CountResult<R> {
  result: R | undefined;
  counters: Counters;
  truncated: boolean;
}

export const DEFAULT_MAX_STEPS = 10_000;

/** Runs an algorithm and stores every event with a counter snapshot, for animation. */
export function runTrace<I, R>(
  algo: Algorithm<I, R>,
  input: I,
  { budget, maxSteps = DEFAULT_MAX_STEPS }: TraceOptions = {},
): TraceResult<R> {
  const ins = new Instrument(budget);
  const gen = algo(input, ins);
  const steps: TraceStep[] = [];
  try {
    for (;;) {
      if (steps.length >= maxSteps) {
        return { steps, result: undefined, counters: cloneCounters(ins.counters), truncated: true };
      }
      const next = gen.next();
      if (next.done) {
        return { steps, result: next.value, counters: cloneCounters(ins.counters), truncated: false };
      }
      steps.push({ event: next.value, counters: cloneCounters(ins.counters) });
    }
  } catch (e) {
    if (!(e instanceof BudgetExceeded)) throw e;
    return { steps, result: undefined, counters: cloneCounters(ins.counters), truncated: true };
  }
}

/** Runs an algorithm discarding events, for benchmarking. */
export function runCount<I, R>(
  algo: Algorithm<I, R>,
  input: I,
  { budget }: RunOptions = {},
): CountResult<R> {
  const ins = new Instrument(budget);
  const gen = algo(input, ins);
  try {
    for (;;) {
      const next = gen.next();
      if (next.done) return { result: next.value, counters: ins.counters, truncated: false };
    }
  } catch (e) {
    if (!(e instanceof BudgetExceeded)) throw e;
    return { result: undefined, counters: ins.counters, truncated: true };
  }
}
