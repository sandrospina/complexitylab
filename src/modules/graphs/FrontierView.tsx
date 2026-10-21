import * as Plot from '@observablehq/plot';
import { useEffect, useMemo } from 'react';
import type { TraceResult } from '../../engine/runner';
import { useWidth } from '../../views/useWidth';

export interface FrontierEntry {
  name: string;
  color: string;
  trace: TraceResult<unknown>;
}

interface Props {
  entries: FrontierEntry[];
  /** Vertices: both searches hold a V-cell visited array besides their frontier. */
  n: number;
  step: number;
}

/** Frontier size (queue or stack cells, beyond the visited array) over the run, for each search. */
export function FrontierView({ entries, n, step }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const series = useMemo(
    () =>
      entries.map((e) => ({
        ...e,
        sizes: e.trace.steps.map((s) => Math.max(0, s.counters.memCells - n)),
        peak: Math.max(0, e.trace.counters.peakMem - n),
      })),
    [entries, n],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const data = series.flatMap((s) => s.sizes.map((size, i) => ({ step: i + 1, size, name: s.name })));
    const color = (name: string) => series.find((s) => s.name === name)?.color ?? 'currentColor';
    const plot = Plot.plot({
      width,
      height: 170,
      marginLeft: 40,
      style: { background: 'transparent', color: 'currentColor' },
      x: { label: 'step →', grid: true },
      y: { label: '↑ frontier cells', grid: true, nice: true },
      marks: [
        Plot.line(data, { x: 'step', y: 'size', z: 'name', stroke: (d) => color(d.name), strokeWidth: 2, curve: 'step-after' }),
        Plot.ruleX([step], { stroke: 'currentColor', strokeOpacity: 0.5, strokeDasharray: '3,3' }),
      ],
    });
    el.replaceChildren(plot);
    return () => plot.remove();
  }, [ref, series, width, step]);

  return (
    <section className="panel stack" aria-label="Frontier size">
      <h2>Frontier: BFS queue vs DFS stack</h2>
      <div className="controls">
        {series.map((s) => (
          <span key={s.name}>
            <span style={{ color: s.color }}>●</span> {s.name} peak:{' '}
            <strong className="mono" data-testid={`peak-frontier-${s.name}`}>
              {s.peak}
            </strong>{' '}
            cells
          </span>
        ))}
      </div>
      <div className="plot" ref={ref} role="img" aria-label="Frontier size over the run for each search" />
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        Both searches also keep a visited mark per vertex ({n} cells), so only the frontier differs.
      </p>
    </section>
  );
}
