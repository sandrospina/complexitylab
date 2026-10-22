import { depths, wireCount, wireName } from '../../algorithms/reductions/circuit';
import type { Circuit } from '../../algorithms/reductions/circuit';
import type { Ref } from '../../algorithms/reductions/types';
import { hasRef } from './Pipeline';

interface Props {
  circuit: Circuit;
  /** Decoded wire values, if solved. */
  values?: boolean[];
  lit: Ref[];
  bad: Set<number>;
  onHover: (ref: Ref | undefined) => void;
}

const W = 600;
const ROW = 46;

/** The circuit as layers by depth: inputs on the left, each gate right of its inputs. */
export function CircuitView({ circuit: c, values, lit, bad, onHover }: Props) {
  const d = depths(c);
  const cols = Math.max(...d) + 1;
  const perCol = Array<number>(cols).fill(0);
  const slot = d.map((x) => perCol[x]!++);
  const height = Math.max(...perCol) * ROW + 20;
  const pos = (w: number): [number, number] => [40 + (d[w]! * (W - 80)) / Math.max(1, cols - 1), 30 + slot[w]! * ROW];
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="tree-svg circuit" role="img" aria-label={`Circuit with ${c.inputs} inputs and ${c.gates.length} gates`}>
      {c.gates.flatMap((g, k) => {
        const w = c.inputs + k;
        const [x2, y2] = pos(w);
        return (g.type === 'not' ? [g.a] : [g.a, g.b]).map((src, j) => {
          const [x1, y1] = pos(src);
          return <line key={`${k}-${j}`} x1={x1} y1={y1} x2={x2 - 22} y2={y2 + (j - 0.5) * 8} className={values?.[src] ? 'on' : undefined} />;
        });
      })}
      {Array.from({ length: wireCount(c) }, (_, w) => {
        const [x, y] = pos(w);
        const gate = w - c.inputs;
        const refs: Ref[] = gate >= 0 ? [{ kind: 'gate', id: gate }, { kind: 'wire', id: w }] : [{ kind: 'wire', id: w }];
        const cls = [
          'node',
          values ? (values[w] ? 'on' : 'off') : '',
          refs.some((r) => hasRef(lit, r)) ? 'lit' : '',
          gate >= 0 && bad.has(gate) ? 'bad' : '',
          w === c.output ? 'output' : '',
        ].join(' ');
        return (
          <g key={w} className={cls} transform={`translate(${x} ${y})`} onMouseEnter={() => onHover(refs[0])} onMouseLeave={() => onHover(undefined)}>
            <title>{`${wireName(c, w)}${values ? ` = ${values[w] ? 1 : 0}` : ''}`}</title>
            {gate < 0 ? <circle r={13} /> : <rect x={-22} y={-14} width={44} height={28} rx={6} />}
            <text y={4} textAnchor="middle">
              {gate < 0 ? wireName(c, w) : c.gates[gate]!.type.toUpperCase()}
            </text>
            {gate >= 0 && (
              <text y={-18} textAnchor="middle" className="small">
                {wireName(c, w)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
