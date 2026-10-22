import * as Plot from '@observablehq/plot';
import { useEffect, useMemo } from 'react';
import type { SweepPoint } from '../../engine/benchmark-core';
import { bestFit } from '../../engine/fit';
import { PHASE_N, PHASE_RATIOS, SAT_ALGOS, SHOOTOUT, SHOOTOUT_N, useSatStore } from '../../store/sat';
import type { SatAlgo } from '../../store/sat';
import { ScalingView } from '../../views/ScalingView';
import type { ScalingSeries } from '../../views/ScalingView';
import { useWidth } from '../../views/useWidth';

export const SAT_META: Record<SatAlgo, { name: string; color: string }> = {
  'truth-table': { name: 'Truth table', color: '#c2417a' },
  backtracking: { name: 'Backtracking', color: '#e08a2e' },
  'dpll-first': { name: 'DPLL, first variable', color: '#7d5ba6' },
  'dpll-moms': { name: 'DPLL, MOMS', color: '#4c78e0' },
  'dpll-jw': { name: 'DPLL, Jeroslow–Wang', color: '#2e9a6a' },
};

const fmt = (x: number) => (Number.isFinite(x) ? Math.round(x).toLocaleString('en-US') : '—');

/** Where satisfiability crosses 50 %, interpolated, and where median decisions peak. */
export function phaseSummary(pts: SweepPoint[]): { crossing?: number; peak?: number } {
  if (pts.length < PHASE_RATIOS.length) return {};
  const i = pts.findIndex((p) => p.success < 0.5);
  const crossing =
    i > 0 ? pts[i - 1]!.param + ((pts[i - 1]!.success - 0.5) / (pts[i - 1]!.success - pts[i]!.success)) * (pts[i]!.param - pts[i - 1]!.param) : undefined;
  const peak = pts.reduce((m, p) => (p.medianDecisions > m.medianDecisions ? p : m)).param;
  return { crossing, peak };
}

function PhasePlot({ pts }: { pts: SweepPoint[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const most = Math.max(1, ...pts.map((p) => p.medianDecisions));
    const data = pts.flatMap((p) => [
      { ratio: p.param, y: 100 * p.success, series: '% satisfiable' },
      { ratio: p.param, y: (100 * p.medianDecisions) / most, series: 'median decisions (% of peak)' },
    ]);
    const color = (s: string) => (s === '% satisfiable' ? '#4c78e0' : '#c2417a');
    const plot = Plot.plot({
      width,
      height: Math.round(Math.min(360, width * 0.5)),
      marginLeft: 48,
      style: { background: 'transparent', color: 'currentColor' },
      x: { label: 'clauses per variable →', domain: [2, 7], grid: true },
      y: { label: '↑ %', domain: [0, 100], grid: true },
      marks: [
        Plot.ruleX([4.26], { stroke: 'currentColor', strokeDasharray: '4,4', strokeOpacity: 0.6 }),
        Plot.text([{ x: 4.26, y: 100 }], { x: 'x', y: 'y', text: () => '4.26', dy: -6, fill: 'currentColor' }),
        Plot.line(data, { x: 'ratio', y: 'y', z: 'series', stroke: (d) => color(d.series), strokeWidth: 2 }),
        Plot.dot(data, { x: 'ratio', y: 'y', fill: (d) => color(d.series), r: 3, tip: true }),
      ],
    });
    el.replaceChildren(plot);
    return () => plot.remove();
  }, [ref, pts, width]);
  return <div className="plot" ref={ref} role="img" aria-label="Phase transition: satisfiable fraction and solver effort against clause ratio" />;
}

export function ExperimentsTab() {
  const { bench, phase, shootout, running } = useSatStore();
  const { runScaling, runPhase, runShootout } = useSatStore.getState();

  const series: ScalingSeries[] = SAT_ALGOS.flatMap((a) => {
    const pts = (bench[a] ?? []).filter((p) => !p.truncated).map((p) => ({ n: p.n, ops: p.ops }));
    if (pts.length === 0) return [];
    const fit = !running.scaling && pts.length >= 3 ? bestFit(pts.map((p) => ({ n: p.n, y: p.ops }))) : undefined;
    return [{ label: SAT_META[a].name, color: SAT_META[a].color, points: pts, fit }];
  });
  const domain = useMemo<[number, number]>(() => [1, 80], []);
  const { crossing, peak } = phaseSummary(phase);
  const ranked = SHOOTOUT.flatMap((a) => (shootout[a] ? [{ a, p: shootout[a]! }] : [])).sort(
    (x, y) => x.p.medianDecisions - y.p.medianDecisions,
  );

  return (
    <div className="stack">
      <section className="panel emphasis stack" aria-label="Scaling">
        <h2>Scaling: how far each solver gets</h2>
        <div>
          <button className="primary" onClick={runScaling} disabled={running.scaling}>
            {running.scaling ? 'Running…' : 'Run scaling experiment'}
          </button>
        </div>
        <ScalingView series={series} domain={domain} xLabel="variables n" initialLogY />
        <p className="muted" style={{ margin: 0 }}>
          The truth table is measured on unsatisfiable formulas (ratio 10), where it must try all 2ⁿ rows. The search
          solvers are measured at ratio 4.26, the hardest place for them, by the median of 64 formulas per n. They are
          exponential too, but with bases so close to 1 that DPLL reaches 80 variables while the truth table stops at 20:
          the worst case is the same class, practice is not.
        </p>
      </section>

      <section className="panel emphasis stack" aria-label="Phase transition">
        <h2>Phase transition at n = {PHASE_N}</h2>
        <div className="controls">
          <button className="primary" onClick={runPhase} disabled={running.phase}>
            {running.phase ? `Running… (${phase.length} of ${PHASE_RATIOS.length} ratios)` : 'Run phase-transition sweep'}
          </button>
          <span data-testid="phase-summary" data-peak={peak} data-crossing={crossing}>
            {peak !== undefined && (
              <>
                Hardest at ratio <strong className="mono">{peak.toFixed(2)}</strong>; 50 % satisfiable at{' '}
                <strong className="mono">{crossing?.toFixed(2) ?? '—'}</strong>.
              </>
            )}
          </span>
        </div>
        {phase.length > 0 && <PhasePlot pts={phase} />}
        <p className="muted" style={{ margin: 0 }}>
          Random 3-SAT with few clauses is almost always satisfiable and easy; with many, almost always unsatisfiable
          and quickly refuted. In between, near 4.26 clauses per variable, satisfiability drops from almost certain to
          almost impossible, and that is exactly where the solver works hardest (64 formulas per ratio, DPLL with
          Jeroslow–Wang).
        </p>
      </section>

      <section className="panel stack" aria-label="Heuristic shoot-out">
        <h2>Heuristic shoot-out</h2>
        <div>
          <button className="primary" onClick={runShootout} disabled={running.shootout}>
            {running.shootout ? 'Running…' : `Race the heuristics on 64 formulas (n = ${SHOOTOUT_N}, ratio 4.26)`}
          </button>
        </div>
        {ranked.length > 0 && (
          <table className="level-sums">
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Heuristic</th>
                <th scope="col">median decisions</th>
                <th scope="col">median ops</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map(({ a, p }, i) => (
                <tr key={a} data-testid={`shootout-${i + 1}`}>
                  <td>{i + 1}</td>
                  <th scope="row">{SAT_META[a].name}</th>
                  <td className="mono">{fmt(p.medianDecisions)}</td>
                  <td className="mono">{fmt(p.medianOps)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
