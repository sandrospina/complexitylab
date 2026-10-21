import { useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { edgesOf } from '../../algorithms/graph/graph';
import type { Graph } from '../../algorithms/graph/graph';
import { CANVAS } from '../../algorithms/graph/presets';
import type { GraphState } from '../../algorithms/graph/replay';

interface Props {
  graph: Graph;
  source: number;
  label: string;
  /** Trace state to colour in: visited/settled, frontier, distances. */
  state?: GraphState;
  /** The vertex being processed. */
  current?: number;
  showWeights?: boolean;
  /** Editing callbacks; without them the drawing is read-only. */
  edit?: {
    mode: 'edges' | 'source';
    onAddVertex: (xy: [number, number]) => void;
    onToggleEdge: (u: number, v: number) => void;
    onSetSource: (v: number) => void;
  };
}

const R = 14;

/** A drawn graph. In edit mode: click empty space for a vertex, two vertices for an edge. */
export function GraphView({ graph, source, label, state, current, showWeights, edit }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const [selected, setSelected] = useState<number | undefined>();
  const pos = graph.pos ?? [];
  const inFrontier = new Set(state?.frontier);

  const onCanvas = (e: MouseEvent<SVGSVGElement>) => {
    if (!edit || e.target !== svg.current) return;
    const ctm = svg.current.getScreenCTM();
    if (!ctm) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    edit.onAddVertex([Math.round(p.x), Math.round(p.y)]);
    setSelected(undefined);
  };

  const pick = (v: number) => {
    if (!edit) return;
    if (edit.mode === 'source') edit.onSetSource(v);
    else if (selected === undefined) setSelected(v);
    else {
      if (selected !== v) edit.onToggleEdge(selected, v);
      setSelected(undefined);
    }
  };
  const onKey = (e: KeyboardEvent, v: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick(v);
    }
  };

  const vertexClass = (v: number) =>
    [
      'gv',
      v === current ? 'current' : inFrontier.has(v) ? 'frontier' : state?.done[v] ? 'done' : '',
      v === source ? 'source' : '',
      v === selected ? 'selected' : '',
    ].join(' ');

  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
      className={`graph-svg${edit ? ' editing' : ''}`}
      role={edit ? 'application' : 'img'}
      aria-label={label}
      onClick={onCanvas}
    >
      {edgesOf(graph).map(([u, v, w]) => {
        const [x1, y1] = pos[u]!;
        const [x2, y2] = pos[v]!;
        // Weight label beside the edge's midpoint, offset along its normal so it never sits on the line.
        const len = Math.hypot(x2 - x1, y2 - y1) || 1;
        const [nx, ny] = [-(y2 - y1) / len, (x2 - x1) / len];
        return (
          <g key={`${u}-${v}`} className="ge">
            <line x1={x1} y1={y1} x2={x2} y2={y2} />
            {showWeights && (
              <text x={(x1 + x2) / 2 + nx * 10} y={(y1 + y2) / 2 + ny * 10 + 4} textAnchor="middle">
                {w}
              </text>
            )}
          </g>
        );
      })}
      {pos.map(([x, y], v) => {
        const d = state?.dist[v];
        const status = v === current ? ', current' : inFrontier.has(v) ? ', in frontier' : state?.done[v] ? ', done' : '';
        return (
          <g
            key={v}
            className={vertexClass(v)}
            transform={`translate(${x} ${y})`}
            role={edit ? 'button' : undefined}
            tabIndex={edit ? 0 : undefined}
            aria-label={`Vertex ${v}${v === source ? ', source' : ''}${status}${d !== undefined ? `, distance ${d}` : ''}`}
            aria-pressed={edit ? selected === v : undefined}
            onClick={edit ? () => pick(v) : undefined}
            onKeyDown={edit ? (e) => onKey(e, v) : undefined}
          >
            <circle r={R} />
            <text y={4} textAnchor="middle">
              {v}
            </text>
            {d !== undefined && (
              <text className="dist" y={R + 13} textAnchor="middle">
                {d}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
