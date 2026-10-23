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
  /** Times each pseudocode line has run, by line number (index 0 unused). */
  lines: number[];
}

export class BudgetExceeded extends Error {
  constructor(readonly reason: 'ops' | 'time') {
    super(`budget exceeded (${reason})`);
  }
}

/** Returned by every method in count mode, where events are discarded unread. */
const DISCARDED: TraceEvent = Object.freeze({ op: 'mark' }) as TraceEvent;

const BOOKKEEPING: ReadonlySet<OpKind> = new Set(['alloc', 'free', 'pushFrame', 'popFrame']);
const TIME_CHECK_INTERVAL = 1024;

export function emptyCounters(): Counters {
  const ops = Object.fromEntries(OP_KINDS.map((k) => [k, 0])) as Record<OpKind, number>;
  return { ops, totalOps: 0, memCells: 0, peakMem: 0, stackDepth: 0, peakStack: 0, lines: [] };
}

export function cloneCounters(c: Counters): Counters {
  return { ...c, ops: { ...c.ops }, lines: c.lines.slice() };
}

/**
 * Every algorithm reports its work through an Instrument. Each method counts the op
 * and returns the TraceEvent, so algorithms write `yield ins.compare({ indices: [i] })`.
 */
export class Instrument {
  readonly counters: Counters = emptyCounters();
  private readonly startMs: number;
  private readonly frames: number[] = [];
  private nextFrame = 0;

  /** `record: false` (count mode) skips building events; counters are identical. */
  constructor(
    private readonly budget: Budget = {},
    private readonly record = true,
  ) {
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
    const e = this.op('alloc', d);
    return this.record ? { ...e, cells } : e;
  }

  free<S>(cells: number, d?: EventDetail<S>): TraceEvent<S> {
    this.counters.memCells -= cells;
    const e = this.op('free', d);
    return this.record ? { ...e, cells } : e;
  }

  pushFrame<S>(d?: EventDetail<S>): TraceEvent<S> {
    const c = this.counters;
    c.stackDepth++;
    c.peakStack = Math.max(c.peakStack, c.stackDepth);
    const parentFrame = this.frames.at(-1);
    const frame = this.nextFrame++;
    this.frames.push(frame);
    const e = this.op('pushFrame', d);
    return this.record ? { ...e, frame, parentFrame } : e;
  }

  popFrame<S>(d?: EventDetail<S>): TraceEvent<S> {
    this.counters.stackDepth--;
    const frame = this.frames.pop();
    const e = this.op('popFrame', d);
    return this.record ? { ...e, frame } : e;
  }

  /** Uncounted annotation for the animation. */
  mark<S>(label: string, d?: EventDetail<S>): TraceEvent<S> {
    if (d?.line !== undefined) this.countLine(d.line);
    if (!this.record) return DISCARDED as TraceEvent<S>;
    return { ...d, op: 'mark', label };
  }

  /**
   * Counts one execution of a pseudocode line that no operation stands for (a loop test,
   * an assignment). It yields no event and counts no op, so traces and op totals are unchanged.
   */
  at(line: number): void {
    this.countLine(line);
  }

  private countLine(line: number) {
    const l = this.counters.lines;
    l[line] = (l[line] ?? 0) + 1;
  }

  private op<S>(op: OpKind, d?: EventDetail<S>): TraceEvent<S> {
    const c = this.counters;
    if (d?.line !== undefined) this.countLine(d.line);
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
    if (!this.record) return DISCARDED as TraceEvent<S>;
    return { ...d, op, frame: this.frames.at(-1) };
  }
}
