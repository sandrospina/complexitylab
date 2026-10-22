import { useRef } from 'react';
import type { MouseEvent } from 'react';
import { CANVAS } from '../../algorithms/graph/presets';
import type { Point } from '../../algorithms/tsp/input';

export interface DrawnTour {
  /** City order; −1 marks a position not filled yet, and the loop only closes once it is full. */
  tour: number[];
  color: string;
  dashed?: boolean;
}

interface Props {
  cities: Point[];
  label: string;
  tours?: DrawnTour[];
  /** Cities to highlight (e.g. Held–Karp's current subset). */
  lit?: Set<number>;
  onAdd?: (p: Point) => void;
}

/** Cities on a canvas with tours drawn over them. With `onAdd`, clicking adds a city. */
export function CityMap({ cities, label, tours = [], lit, onAdd }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const click = (e: MouseEvent<SVGSVGElement>) => {
    const ctm = svg.current?.getScreenCTM();
    if (!onAdd || !ctm) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    onAdd([Math.round(p.x), Math.round(p.y)]);
  };
  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
      className={`city-svg${onAdd ? ' editing' : ''}`}
      role={onAdd ? 'application' : 'img'}
      aria-label={label}
      onClick={click}
    >
      {tours.map(({ tour, color, dashed }, k) => {
        const filled = tour.filter((c) => c >= 0 && c < cities.length);
        const closed = filled.length === cities.length && filled.length > 2;
        const pts = [...filled, ...(closed ? [filled[0]!] : [])].map((c) => cities[c]!.join(',')).join(' ');
        return <polyline key={k} points={pts} stroke={color} className={dashed ? 'best' : undefined} />;
      })}
      {cities.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={6} className={i === 0 ? 'start' : lit?.has(i) ? 'lit' : undefined} />
          <text x={x + 9} y={y - 7}>
            {i}
          </text>
        </g>
      ))}
    </svg>
  );
}
