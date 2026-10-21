import * as Plot from '@observablehq/plot';
import { useEffect, useRef, useState } from 'react';
import { CLASS_LABEL } from '../engine/complexity';
import { extrapolate } from '../engine/fit';
import type { Fit } from '../engine/fit';

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
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => entry && setWidth(Math.max(280, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

const logSpaced = ([lo, hi]: [number, number], k: number) =>
  Array.from({ length: k }, (_, i) => lo * (hi / lo) ** (i / (k - 1)));

/** Measured op counts against n, with the best-fit curve for each series. */
export function ScalingView({ series, markers = [], domain }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [logX, setLogX] = useState(false);
  const [logY, setLogY] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measured = series.flatMap((s) => s.points.map((p) => ({ ...p, label: s.label })));
    const fitted = series.flatMap((s) =>
      s.fit
        ? logSpaced(domain, 60).map((n) => ({
            n,
            ops: Math.max(1, extrapolate(s.fit!, n)),
            label: `${s.label} fit ${CLASS_LABEL[s.fit!.cls]}`,
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
      x: { type: logX ? 'log' : 'linear', domain: logX ? domain : [0, domain[1]], label: 'input size n →', grid: true },
      y: { type: logY ? 'log' : 'linear', label: '↑ operations', grid: true, nice: true },
      marks: [
        Plot.line(fitted, { x: 'n', y: 'ops', z: 'label', stroke: (d) => color(d.series), strokeDasharray: '5,4', strokeOpacity: 0.7 }),
        Plot.line(measured, { x: 'n', y: 'ops', z: 'label', stroke: (d) => color(d.label), strokeWidth: 2 }),
        Plot.dot(measured, { x: 'n', y: 'ops', fill: (d) => color(d.label), r: 3, tip: true, title: (d) => `${d.label}\nn = ${d.n.toLocaleString()}\nops = ${d.ops.toLocaleString()}` }),
        Plot.dot(markers, { x: 'n', y: (d) => Math.max(d.ops, logY ? 1 : 0), stroke: (d) => color(d.label), r: 7, strokeWidth: 2.5 }),
      ],
    });
    el.replaceChildren(plot);
    return () => plot.remove();
  }, [ref, series, markers, domain, width, logX, logY]);

  return (
    <div>
      <div className="controls">
        {series.map((s) => (
          <span key={s.label}>
            <span style={{ color: s.color }}>●</span> {s.label}
            {s.fit && (
              <span className="muted" data-testid={`fit-${s.label}`}>
                {' '}— best fit {CLASS_LABEL[s.fit.cls]}
              </span>
            )}
          </span>
        ))}
        <label>
          <input type="checkbox" checked={logX} onChange={(e) => setLogX(e.target.checked)} /> log scale n
        </label>
        <label>
          <input type="checkbox" checked={logY} onChange={(e) => setLogY(e.target.checked)} /> log scale y
        </label>
      </div>
      <div className="plot" ref={ref} role="img" aria-label="Scaling plot of operations against n" />
      <p className="muted" style={{ fontSize: 13, margin: 0 }}>
        Solid: measured op counts. Dashed: fitted curve, extended beyond the measured range. Ring: the
        animated run at the current step.
      </p>
    </div>
  );
}
