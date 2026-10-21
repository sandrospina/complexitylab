import { OP_KINDS } from './events';
import type { EventDetail, OpKind, TraceEvent } from './events';

export interface Budget {
  maxOps?: number;
  maxMs?: number;
}

export interface Counters {
  ops: Record<OpKind, number>;
  /** Sum of all counted ops except alloc/free/pushFrame/popFrame bookkeeping. */
  totalOps: number;
  memCells: number;
  peakMem: number;
  stackDepth: number;
  peakStack: number;
}

export class BudgetExceeded extends Error {
  constructor(readonly reason: 'ops' | 'time') {
    super(`budget exceeded (${reason})`);
  }
}

const BOOKKEEPING: ReadonlySet<OpKind> = new Set(['alloc', 'free', 'pushFrame', 'popFrame']);
const TIME_CHECK_INTERVAL = 1024;

export function emptyCounters(): Counters {
  const ops = Object.fromEntries(OP_KINDS.map((k) => [k, 0])) as Record<OpKind, number>;
  return { ops, totalOps: 0, memCells: 0, peakMem: 0, stackDepth: 0, peakStack: 0 };
}

export function cloneCounters(c: Counters): Counters {
  return { ...c, ops: { ...c.ops } };
}

/**
 * Every algorithm reports its work through an Instrument. Each method counts the op
 * and returns the TraceEvent, so algorithms write `yield ins.compare({ indices: [i] })`.
 */
export class Instrument {
  readonly counters: Counters = emptyCounters();
  private readonly startMs: number;

  constructor(private readonly budget: Budget = {}) {
    this.startMs = budget.maxMs === undefined ? 0 : performance.now();
  }

  compare<S>(d?: EventDetail<S>) {
    return this.op('compare', d);
  }
  read<S>(d?: EventDetail<S>) {
    return this.op('read', d);
  }
  write<S>(d?: EventDetail<S>) {
    return this.op('write', d);
  }
  swap<S>(d?: EventDetail<S>) {
    return this.op('swap', d);
  }
  clauseCheck<S>(d?: EventDetail<S>) {
    return this.op('clauseCheck', d);
  }
  decide<S>(d?: EventDetail<S>) {
    return this.op('decide', d);
  }
  propagate<S>(d?: EventDetail<S>) {
    return this.op('propagate', d);
  }
  conflict<S>(d?: EventDetail<S>) {
    return this.op('conflict', d);
  }

  alloc<S>(cells: number, d?: EventDetail<S>): TraceEvent<S> {
    const c = this.counters;
    c.memCells += cells;
    c.peakMem = Math.max(c.peakMem, c.memCells);
    return { ...this.op('alloc', d), cells };
  }

  free<S>(cells: number, d?: EventDetail<S>): TraceEvent<S> {
    this.counters.memCells -= cells;
    return { ...this.op('free', d), cells };
  }

  pushFrame<S>(d?: EventDetail<S>) {
    const c = this.counters;
    c.stackDepth++;
    c.peakStack = Math.max(c.peakStack, c.stackDepth);
    return this.op('pushFrame', d);
  }

  popFrame<S>(d?: EventDetail<S>) {
    this.counters.stackDepth--;
    return this.op('popFrame', d);
  }

  /** Uncounted annotation for the animation. */
  mark<S>(label: string, d?: EventDetail<S>): TraceEvent<S> {
    return { ...d, op: 'mark', label };
  }

  private op<S>(op: OpKind, d?: EventDetail<S>): TraceEvent<S> {
    const c = this.counters;
    if (!BOOKKEEPING.has(op)) {
      const { maxOps, maxMs } = this.budget;
      if (maxOps !== undefined && c.totalOps >= maxOps) throw new BudgetExceeded('ops');
      if (
        maxMs !== undefined &&
        c.totalOps % TIME_CHECK_INTERVAL === 0 &&
        performance.now() - this.startMs > maxMs
      ) {
        throw new BudgetExceeded('time');
      }
      c.totalOps++;
    }
    c.ops[op]++;
    return { ...d, op };
  }
}
