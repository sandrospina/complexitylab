import { useState } from 'react';
import { levelSums } from '../engine/calltree';
import type { CallNode } from '../engine/calltree';

interface Props {
  nodes: CallNode[];
  /** Size of the whole problem, the root's width. */
  n: number;
  /** Current timeline step: frames on the stack are highlighted, returned ones filled. */
  step: number;
  /** Left edge of a node's subproblem in [0, n); defaults to packing children left to right. */
  offset?: (node: CallNode) => number | undefined;
  costLabel: string;
}

const WIDTH = 640;

/** The call tree one level per row, node width ∝ subproblem size, with each level's total cost. */
export function RecursionTreeView({ nodes, n, step, offset, costLabel }: Props) {
  const depth = nodes.reduce((d, x) => Math.max(d, x.depth + 1), 0);
  const [shown, setShown] = useState(1);
  const visible = Math.min(shown, depth);
  const sums = levelSums(nodes);
  const rowH = depth > 16 ? 14 : 28;
  const scale = WIDTH / Math.max(1, n);

  // Fallback layout: pack each parent's children left to right.
  const packed = new Map<number, number>();
  const nextChild = new Map<number, number>();
  for (const node of nodes) {
    const x =
      offset?.(node) ??
      (node.parent === undefined ? 0 : (nextChild.get(node.parent) ?? packed.get(node.parent) ?? 0));
    packed.set(node.id, x);
    if (node.parent !== undefined) nextChild.set(node.parent, x + node.size);
  }

  const state = (node: CallNode) =>
    step <= node.startStep ? 'pending' : node.endStep !== undefined && step > node.endStep ? 'done' : 'active';

  const totals = sums.slice(0, visible).map((_, d) => sums.slice(0, d + 1).reduce((a, b) => a + b, 0));
  return (
    <div className="stack">
      <div className="controls">
        <button onClick={() => setShown(visible + 1)} disabled={visible >= depth}>
          Expand next level
        </button>
        <button onClick={() => setShown(depth)} disabled={visible >= depth}>
          Expand all
        </button>
        <button onClick={() => setShown(1)} disabled={visible <= 1}>
          Collapse
        </button>
        <span className="muted">
          {visible} of {depth} levels
        </span>
      </div>
      <div className="tree-layout">
        <svg
          viewBox={`0 0 ${WIDTH} ${visible * rowH}`}
          className="tree-svg"
          role="img"
          aria-label={`Recursion tree, ${visible} of ${depth} levels shown`}
        >
          {nodes
            .filter((node) => node.depth < visible)
            .map((node) => {
              const x = (packed.get(node.id) ?? 0) * scale;
              const w = Math.max(2, node.size * scale - 2);
              const y = node.depth * rowH;
              return (
                <g key={node.id} className={`tree-node ${state(node)}`}>
                  <title>{`${node.label}: ${node.ownOps} ${costLabel}`}</title>
                  <rect x={x + 1} y={y + 2} width={w} height={rowH - 4} rx={3} />
                  {w > 22 && rowH >= 20 && (
                    <text x={x + 1 + w / 2} y={y + rowH / 2 + 4} textAnchor="middle">
                      {node.ownOps}
                    </text>
                  )}
                </g>
              );
            })}
        </svg>
        <table className="level-sums">
          <thead>
            <tr>
              <th scope="col">Level</th>
              <th scope="col">{costLabel}</th>
              <th scope="col">Running total</th>
            </tr>
          </thead>
          <tbody>
            {sums.slice(0, visible).map((s, d) => (
              <tr key={d}>
                <td>{d}</td>
                <td className="mono" data-testid={`level-sum-${d}`}>
                  {s}
                </td>
                <td className="mono">{totals[d]}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={2}>
                Total
              </th>
              <td className="mono" data-testid="tree-total">
                {totals.at(-1) ?? 0}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
