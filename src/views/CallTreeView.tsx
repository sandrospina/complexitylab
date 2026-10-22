import { useEffect, useMemo, useRef, useState } from 'react';
import type { CallNode } from '../engine/calltree';
import { layoutCallTree } from './call-tree-layout';
import type { PlacedNode } from './call-tree-layout';

interface Props {
  /** The calls the run actually made. */
  nodes: CallNode[];
  /**
   * The full tree the run is a pruned copy of (naive recursion for a memoised run). Calls
   * missing from `nodes` shrink into their nearest surviving ancestor, so switching runs
   * shows the tree collapse.
   */
  reference?: CallNode[];
  /** Current timeline step: calls on the stack are highlighted, returned ones filled. */
  step: number;
  /** Text inside a node; defaults to its subproblem size. */
  nodeText?: (node: CallNode) => string;
  /** Extra classes for a node once it has started, e.g. 'conflict'. */
  nodeClass?: (node: CallNode) => string | undefined;
  /** What the tree's nodes are, for its accessible name. */
  noun?: string;
}

const WIDTH = 640;
const ROW = 46;
const TWEEN_MS = 700;

interface Pos {
  x: number;
  y: number;
  /** 1 shown, 0 collapsed. */
  o: number;
}

type Layout = Map<string, Pos>;

/** Animates from the previous layout to `target` whenever it changes. */
function useTween(target: Layout): Layout {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / TWEEN_MS);
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const next: Layout = new Map();
      for (const [k, b] of target) {
        const a = start.get(k) ?? b;
        next.set(k, { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, o: a.o + (b.o - a.o) * e });
      }
      from.current = next;
      setShown(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return shown;
}

/** The call tree as nodes and links, one row per depth. */
export function CallTreeView({ nodes, reference = nodes, step, nodeText, nodeClass, noun = 'calls' }: Props) {
  const { full, run, height, r, target } = useMemo(() => {
    const full = layoutCallTree(reference);
    const run = layoutCallTree(nodes);
    const live = new Map(run.placed.map((p) => [p.key, p]));
    const sx = WIDTH / Math.max(1, run.leaves);
    const pos = (p: PlacedNode): Pos => ({ x: (p.x + 0.5) * sx, y: p.y * ROW + ROW / 2, o: 1 });
    const target: Layout = new Map();
    for (const p of full.placed) {
      // A pruned call sits on its nearest ancestor that the run did make.
      let k: string | undefined = p.key;
      while (k !== undefined && !live.has(k)) k = k.includes('.') ? k.slice(0, k.lastIndexOf('.')) : undefined;
      const at = k === undefined ? undefined : live.get(k);
      target.set(p.key, at ? { ...pos(at), o: at.key === p.key ? 1 : 0 } : { x: 0, y: 0, o: 0 });
    }
    return { full, run, height: Math.max(1, run.depth) * ROW, r: Math.min(15, sx * 0.42), target };
  }, [nodes, reference]);
  const shown = useTween(target);

  const live = new Map(run.placed.map((p) => [p.key, p]));
  const internal = new Set(full.placed.filter((p) => !p.leaf).map((p) => p.key));
  const state = (node: CallNode) =>
    step <= node.startStep ? 'pending' : node.endStep !== undefined && step > node.endStep ? 'done' : 'active';

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="tree-svg call-tree"
      role="img"
      aria-label={`${noun === 'calls' ? 'Call' : 'Search'} tree with ${run.placed.length} ${noun}, ${run.depth} deep`}
    >
      {full.placed.map((p) => {
        const a = shown.get(p.key);
        const b = p.parentKey === undefined ? undefined : shown.get(p.parentKey);
        if (!a || !b || a.o < 0.01) return null;
        return <line key={`e${p.key}`} x1={b.x} y1={b.y} x2={a.x} y2={a.y} strokeOpacity={a.o} />;
      })}
      {full.placed.map((p) => {
        const a = shown.get(p.key);
        if (!a || a.o < 0.01) return null;
        const call = live.get(p.key);
        // A call that the reference expands but the run answered at once: a memo hit.
        const hit = call !== undefined && call.leaf && internal.has(p.key);
        const st = call ? state(call.node) : 'pending';
        const extra = call && st !== 'pending' ? nodeClass?.(call.node) : undefined;
        const cls = `tree-node ${st}${hit ? ' hit' : ''}${extra ? ` ${extra}` : ''}`;
        return (
          <g key={p.key} className={cls} transform={`translate(${a.x} ${a.y})`} opacity={a.o}>
            <title>{`${p.node.label}${hit ? ': memo hit' : ''}`}</title>
            <circle r={r} />
            {r >= 6 && (
              <text y={Math.min(4, r * 0.4)} textAnchor="middle" fontSize={Math.min(11, r * 1.3)}>
                {nodeText ? nodeText(p.node) : p.node.size}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
