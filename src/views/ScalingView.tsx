import * as Plot from '@observablehq/plot';
import { useEffect, useState } from 'react';
import { extrapolate, fitLabel } from '../engine/fit';
import type { Fit } from '../engine/fit';
import { useWidth } from './useWidth';

export interface ScalingSeries {
  label: string;
  color: string;
  points: { n: number; ops: number }[];
  fit?: Fit;
}

export interface ScalingMarker {
  label: string;
  color: string;
  n: number;
  ops: number;
}

interface Props {
  series: ScalingSeries[];
  /** Where the animation is right now: the small-n run, at the current step. */
  markers?: ScalingMarker[];
  /** x-range of the plot; fits are drawn (dashed) across all of it. */
  domain: [number, number];
  /** What the y-axis counts. */
  yLabel?: string;
  /** What n is, when it is not the input size (e.g. "bits of W"). */
  xLabel?: string;
  /** Start with log axes, for curves that span many orders of magnitude. */
  initialLogY?: boolean;
  initialLogX?: boolean;
}

const logSpaced = ([lo, hi]: [number, number], k: number) =>
  Array.from({ length: k }, (_, i) => lo * (hi / lo) ** (i / (k - 1)));

/** Measured op counts against n, with the best-fit curve for each series. */
export function ScalingView({ series, markers = [], domain, yLabel = 'operations', xLabel = 'input size n', initialLogY = false, initialLogX = false }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [logX, setLogX] = useState(initialLogX);
  const [logY, setLogY] = useState(initialLogY);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measured = series.flatMap((s) => s.points.map((p) => ({ ...p, label: s.label })));
    const fitted = series.flatMap((s) =>
      s.fit
        ? logSpaced(domain, 60).map((n) => ({
            n,
            ops: Math.max(1, extrapolate(s.fit!, n)),
            label: `${s.label} fit ${fitLabel(s.fit!)}`,
            series: s.label,
          }))
        : [],
    );
    const color = (label: string) => series.find((s) => label.startsWith(s.label))?.color ?? 'currentColor';

    const plot = Plot.plot({
      width,
      height: Math.round(Math.min(420, width * 0.55)),
      marginLeft: 60,
      style: { background: 'transparent', color: 'currentColor' },
      x: { type: logX ? 'log' : 'linear', domain: logX ? domain : [0, domain[1]], label: `${xLabel} →`, grid: true },
      // A log axis would otherwise label every 2, 3, … 9 between powers of ten.
      y: { type: logY ? 'log' : 'linear', label: `↑ ${yLabel}`, grid: true, nice: true, ticks: logY ? 6 : undefined, tickFormat: logY ? '~s' : undefined },
      marks: [
        Plot.line(fitted, { x: 'n', y: 'ops', z: 'label', stroke: (d) => color(d.series), strokeDasharray: '5,4', strokeOpacity: 0.7 }),
        Plot.line(measured, { x: 'n', y: 'ops', z: 'label', stroke: (d) => color(d.label), strokeWidth: 2 }),
        Plot.dot(measured, { x: 'n', y: 'ops', fill: (d) => color(d.label), r: 3, tip: true, title: (d) => `${d.label}\nn = ${d.n.toLocaleString()}\nops = ${d.ops.toLocaleString()}` }),
        Plot.dot(markers, { x: 'n', y: (d) => Math.max(d.ops, logY ? 1 : 0), stroke: (d) => color(d.label), r: 7, strokeWidth: 2.5 }),
      ],
    });
    el.replaceChildren(plot);
    return () => plot.remove();
  }, [ref, series, markers, domain, width, logX, logY, yLabel, xLabel]);

  return (
    <div>
      <div className="controls">
        {series.map((s) => (
          <span key={s.label}>
            <span style={{ color: s.color }}>●</span> {s.label}
            {s.fit && (
              <span className="muted" data-testid={`fit-${s.label}`}>
                {' '}— best fit {fitLabel(s.fit)}
              </span>
            )}
          </span>
        ))}
        <label>
          <input type="checkbox" checked={logX} onChange={(e) => setLogX(e.target.checked)} /> log scale x
        </label>
        <label>
          <input type="checkbox" checked={logY} onChange={(e) => setLogY(e.target.checked)} /> log scale y
        </label>
      </div>
      <div className="plot" ref={ref} role="img" aria-label={`Scaling plot of ${yLabel} against ${xLabel}`} />
      <p className="muted" style={{ fontSize: 13, margin: 0 }}>
        Solid: measured {yLabel}. Dashed: fitted curve, extended beyond the measured range. Ring: the
        animated run at the current step.
      </p>
    </div>
  );
}
