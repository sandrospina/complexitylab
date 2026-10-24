interface Props {
  n: number;
  out: number[][];
  /** Vertex positions in a 0..1 square; a circle when omitted. */
  pos?: [number, number][];
  label: string;
  /** Extra classes per vertex, e.g. 'visited' or 'current'. */
  vertexClass?: (v: number) => string | undefined;
  /** Extra classes per edge. */
  edgeClass?: (u: number, v: number) => string | undefined;
  vertexText?: (v: number) => string;
  onVertex?: (v: number) => void;
  /** Accessible name of a vertex when it is clickable. */
  vertexLabel?: (v: number) => string;
  width?: number;
  height?: number;
}

const R = 15;

/** A small directed graph: vertices on a circle (or at given positions), edges as arrows. */
export function DigraphView({ n, out, pos, label, vertexClass, edgeClass, vertexText, onVertex, vertexLabel, width: W = 420, height: H = 300 }: Props) {
  const at = (v: number): [number, number] => {
    if (pos) return [30 + pos[v]![0] * (W - 60), 24 + pos[v]![1] * (H - 48)];
    const a = -Math.PI / 2 + (2 * Math.PI * v) / Math.max(n, 1);
    return [W / 2 + (H / 2 - 28) * 1.3 * Math.cos(a), H / 2 + (H / 2 - 28) * Math.sin(a)];
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="graph-svg digraph"
      style={{ maxWidth: W }} role="img" aria-label={label}>
      <defs>
        <marker id="dg-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" className="dg-arrowhead" />
        </marker>
      </defs>
      {out.flatMap((heads, u) =>
        heads.map((v) => {
          const [x1, y1] = at(u);
          const [x2, y2] = at(v);
          const len = Math.hypot(x2 - x1, y2 - y1) || 1;
          const [ux, uy] = [(x2 - x1) / len, (y2 - y1) / len];
          // Two-way edges are drawn as two arrows a little apart.
          const back = out[v]!.includes(u) ? 4 : 0;
          const [ox, oy] = [-uy * back, ux * back];
          return (
            <line
              key={`${u}-${v}`}
              className={`dg-edge ${edgeClass?.(u, v) ?? ''}`}
              x1={x1 + ux * R + ox}
              y1={y1 + uy * R + oy}
              x2={x2 - ux * (R + 2) + ox}
              y2={y2 - uy * (R + 2) + oy}
              markerEnd="url(#dg-arrow)"
            />
          );
        }),
      )}
      {Array.from({ length: n }, (_, v) => {
        const [x, y] = at(v);
        return (
          <g
            key={v}
            className={`dg-vertex ${vertexClass?.(v) ?? ''}${onVertex ? ' clickable' : ''}`}
            transform={`translate(${x} ${y})`}
            onClick={onVertex ? () => onVertex(v) : undefined}
            onKeyDown={onVertex ? (e) => (e.key === 'Enter' || e.key === ' ') && onVertex(v) : undefined}
            role={onVertex ? 'button' : undefined}
            tabIndex={onVertex ? 0 : undefined}
            aria-label={onVertex ? (vertexLabel?.(v) ?? `vertex ${v}`) : undefined}
          >
            <circle r={R} />
            <text y={4} textAnchor="middle">
              {vertexText ? vertexText(v) : v}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
