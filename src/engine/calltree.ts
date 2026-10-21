import type { OpKind } from './events';
import type { TraceStep } from './runner';

export interface CallNode {
  id: number;
  parent: number | undefined;
  depth: number;
  label: string;
  /** Subproblem size, from the pushFrame event's `value` (0 if absent). */
  size: number;
  /** The pushFrame event's snapshot, e.g. the subarray bounds, for laying the node out. */
  snapshot?: unknown;
  /** Ops charged to this frame itself, excluding its callees. */
  ownOps: number;
  /** Index of the pushFrame step, and of the popFrame step once the call returns. */
  startStep: number;
  endStep?: number;
}

const BOOKKEEPING: ReadonlySet<string> = new Set(['alloc', 'free', 'pushFrame', 'popFrame', 'mark']);

/**
 * Rebuilds the call tree from a trace. Nodes come out in call order (pre-order), so a
 * parent always precedes its children. `metric` picks which op kind counts as cost.
 */
export function buildCallTree(steps: TraceStep[], metric: OpKind | 'total' = 'total'): CallNode[] {
  const nodes: CallNode[] = [];
  const byId = new Map<number, CallNode>();
  steps.forEach(({ event: e }, i) => {
    if (e.op === 'pushFrame' && e.frame !== undefined) {
      const parent = e.parentFrame === undefined ? undefined : byId.get(e.parentFrame);
      const node: CallNode = {
        id: e.frame,
        parent: e.parentFrame,
        depth: parent ? parent.depth + 1 : 0,
        label: e.label ?? '',
        size: typeof e.value === 'number' ? e.value : 0,
        snapshot: e.snapshot,
        ownOps: 0,
        startStep: i,
      };
      nodes.push(node);
      byId.set(e.frame, node);
    } else if (e.op === 'popFrame' && e.frame !== undefined) {
      const node = byId.get(e.frame);
      if (node) node.endStep = i;
    } else if (e.frame !== undefined && !BOOKKEEPING.has(e.op) && (metric === 'total' || e.op === metric)) {
      const node = byId.get(e.frame);
      if (node) node.ownOps++;
    }
  });
  return nodes;
}

/** Sum of own cost at each depth. */
export function levelSums(nodes: CallNode[]): number[] {
  const sums: number[] = [];
  for (const n of nodes) sums[n.depth] = (sums[n.depth] ?? 0) + n.ownOps;
  return Array.from(sums, (s) => s ?? 0);
}
