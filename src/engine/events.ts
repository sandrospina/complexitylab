/** Operation kinds that are counted. Each maps to one Instrument method. */
export const OP_KINDS = [
  'compare',
  'read',
  'write',
  'swap',
  'alloc',
  'free',
  'pushFrame',
  'popFrame',
  'clauseCheck',
  'decide',
  'propagate',
  'conflict',
] as const;

export type OpKind = (typeof OP_KINDS)[number];

/** Optional detail an algorithm attaches to an event so views can draw it. */
export interface EventDetail<S = unknown> {
  /** Positions touched by the op (array indices, vertex ids, variable ids, ...). */
  indices?: number[];
  value?: unknown;
  label?: string;
  /** View-specific state at this instant, e.g. { lo, hi, mid } for binary search. */
  snapshot?: S;
}

export interface TraceEvent<S = unknown> extends EventDetail<S> {
  /** 'mark' is an uncounted annotation (e.g. "found", "pivot chosen"). */
  op: OpKind | 'mark';
  /** Cells allocated or freed, for alloc/free events. */
  cells?: number;
  /**
   * Call frame: on pushFrame the new frame's id, on popFrame the frame being left, on
   * counted ops the frame they are charged to. Undefined outside any frame.
   */
  frame?: number;
  /** On pushFrame only: the caller's frame. */
  parentFrame?: number;
}
