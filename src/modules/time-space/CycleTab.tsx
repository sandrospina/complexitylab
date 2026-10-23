import { useMemo } from 'react';
import { cycleFloyd } from '../../algorithms/cycle/floyd';
import { cycleHash } from '../../algorithms/cycle/hash';
import { CYCLE_KINDS, makeRho, splitFor } from '../../algorithms/cycle/input';
import type { CycleInput, CycleKind, CycleResult, CycleSnapshot } from '../../algorithms/cycle/input';
import { bestFit } from '../../engine/fit';
import { mulberry32 } from '../../engine/rng';
import { runTrace } from '../../engine/runner';
import type { Algorithm, TraceStep } from '../../engine/runner';
import { CYCLE_ALGOS, MAX_CYCLE_N, useCycleStore } from '../../store/cycle';
import type { CycleAlgo } from '../../store/cycle';
import type { YMetric } from '../../store/time-space';
import { MemoryView } from '../../views/MemoryView';
import { PredictWidget } from '../../views/PredictWidget';
import { RaceView } from '../../views/RaceView';
import { ScalingView } from '../../views/ScalingView';
import type { ScalingSeries } from '../../views/ScalingView';
import { Timeline } from '../../views/Timeline';
import { frameAt } from '../../views/trace-frames';

const META: Record<CycleAlgo, { name: string; color: string; generator: Algorithm<CycleInput, CycleResult> }> = {
  'cycle-hash': { name: 'Hash set', color: '#c2417a', generator: cycleHash },
  'cycle-floyd': { name: "Floyd's tortoise and hare", color: '#2e9a6a', generator: cycleFloyd },
};
const DOMAIN: [number, number] = [1, 2 ** 16];

/** Values the hash set has stored after `upTo` steps. */
function seenUpTo(steps: TraceStep[], upTo: number): Set<number> {
  const seen = new Set<number>();
  for (const { event: e } of steps.slice(0, upTo)) if (e.op === 'alloc' && e.indices) seen.add(e.indices[0]!);
  return seen;
}

interface RhoProps {
  order: number[];
  mu: number;
  label: string;
  seen?: Set<number>;
  at?: number;
  tortoise?: number;
  hare?: number;
}

const W = 600;
const H = 250;

/** The sequence as a ρ: the tail on a line, the loop on a circle, arrows following f. */
function RhoView({ order, mu, label, seen, at, tortoise, hare }: RhoProps) {
  const n = order.length;
  const lambda = n - mu;
  const R = Math.min(105, Math.max(30, (lambda * 26) / (2 * Math.PI)));
  const cx = mu === 0 ? W / 2 : Math.min(W - R - 20, 60 + mu * 28 + R);
  const cy = H / 2;
  const tailStep = mu === 0 ? 0 : Math.min(32, (cx - R - 40) / mu);
  const pos = (i: number): [number, number] => {
    if (i < mu) return [cx - R - (mu - i) * tailStep, cy];
    const angle = Math.PI - (2 * Math.PI * (i - mu)) / lambda;
    return [cx + R * Math.cos(angle), cy - R * Math.sin(angle)];
  };
  const r = n > 30 ? 9 : 12;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="tree-svg rho" role="img" aria-label={label}>
      <defs>
        <marker id="rho-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" className="rho-arrowhead" />
        </marker>
      </defs>
      {order.map((_, i) => {
        const j = i + 1 < n ? i + 1 : mu;
        const [x1, y1] = pos(i);
        const [x2, y2] = pos(j);
        if (i === j) return <circle key={`e${i}`} cx={x1} cy={y1 - r - 8} r={8} className="rho-self" />;
        const len = Math.hypot(x2 - x1, y2 - y1) || 1;
        const ux = (x2 - x1) / len;
        const uy = (y2 - y1) / len;
        return <line key={`e${i}`} x1={x1 + ux * r} y1={y1 + uy * r} x2={x2 - ux * (r + 2)} y2={y2 - uy * (r + 2)} markerEnd="url(#rho-arrow)" />;
      })}
      {order.map((v, i) => {
        const [x, y] = pos(i);
        const cls = ['rho-node', seen?.has(v) ? 'seen' : '', v === at ? 'at' : '', i === mu ? 'entrance' : ''].join(' ');
        return (
          <g key={v} className={cls} transform={`translate(${x} ${y})`}>
            <title>{`value ${v}, step ${i}${i === mu ? ', where the loop starts' : ''}`}</title>
            <circle r={r} />
            <text y={4} textAnchor="middle">
              {v}
            </text>
          </g>
        );
      })}
      {/* Drawn last so no node covers them, and pushed outward from the node. */}
      {([
        ['T', tortoise, 'tortoise', -1],
        ['H', hare, 'hare', 1],
      ] as const).map(([letter, value, cls, side]) => {
        if (value === undefined) return null;
        const i = order.indexOf(value);
        const [x, y] = pos(i);
        // Tail and the loop's entrance (where the tail joins): T above, H below.
        // Elsewhere on the loop: both outside the circle, side by side.
        const [ox, oy] =
          i <= mu
            ? [0, side * (r + 11)]
            : (() => {
                const ux = (x - cx) / R;
                const uy = (y - cy) / R;
                return [ux * (r + 11) - uy * side * 9, uy * (r + 11) + ux * side * 9];
              })();
        return (
          <g key={letter} className={`pointer ${cls}`} transform={`translate(${x + ox} ${y + oy})`} aria-label={`${cls} at ${value}`}>
            <rect x={-8} y={-8} width={16} height={16} rx={4} />
            <text y={4} textAnchor="middle">
              {letter}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const Y_LABEL: Record<YMetric, string> = { ops: 'operations', mem: 'peak memory cells' };

export function CycleTab() {
  const { n, kind, seed, step, yMetric, predictions, bench, benchRunning } = useCycleStore();
  const { configure, setStep, setYMetric, predict, runBench } = useCycleStore.getState();

  const rho = useMemo(() => {
    const rng = mulberry32(seed);
    const [mu, lambda] = splitFor(n, kind, rng);
    return { mu, lambda, ...makeRho(mu, lambda, rng) };
  }, [n, kind, seed]);
  const traces = useMemo(
    () => CYCLE_ALGOS.map((a) => ({ a, trace: runTrace(META[a].generator, { next: rho.next, start: rho.start }) })),
    [rho],
  );
  const maxStep = Math.max(...traces.map((t) => t.trace.steps.length));
  const s = Math.min(step, maxStep);

  const series: ScalingSeries[] = CYCLE_ALGOS.flatMap((a) => {
    const pts = (bench[a] ?? [])
      .filter((p) => !p.truncated)
      .map((p) => ({ n: p.n, ops: yMetric === 'ops' ? p.ops : p.peakMem + p.peakStack }));
    if (pts.length === 0) return [];
    const fit = !benchRunning && pts.length >= 3 ? bestFit(pts.map((p) => ({ n: p.n, y: p.ops }))) : undefined;
    return [{ label: META[a].name, color: META[a].color, points: pts, fit }];
  });

  return (
    <div className="stack">
      <section className="panel controls" aria-label="Sequence">
        <label>
          n = <span className="mono">{n}</span>
          <input type="range" min={1} max={MAX_CYCLE_N} value={n} onChange={(e) => configure({ n: Number(e.target.value) })} aria-label="Sequence length n" />
        </label>
        <label>
          Shape
          <select value={kind} onChange={(e) => configure({ kind: e.target.value as CycleKind })}>
            {CYCLE_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => configure({ seed: seed + 1 })}>New labels</button>
        <span className="muted" data-testid="rho-shape">
          tail μ = {rho.mu}, loop λ = {rho.lambda}
        </span>
      </section>

      <p className="muted" style={{ margin: 0 }}>
        Start at x₀ and keep applying f: x₀, f(x₀), f(f(x₀)), … With finitely many values the sequence must repeat, and
        from then on it goes round a loop. Where does the loop start, and how long is it? The labels are shuffled, so a
        value says nothing about its position.
      </p>

      <div className="grid-2">
        <RaceView<CycleSnapshot>
          step={s}
          metric="total"
          metricLabel="ops"
          n={n}
          entries={traces.map(({ a, trace }) => ({
            key: a,
            algoId: `time-space/${a}`,
            name: META[a].name,
            color: META[a].color,
            trace,
            render: (f) => {
              const done = f.step >= trace.steps.length ? (trace.result as CycleResult | undefined) : undefined;
              return (
                <div className="stack" style={{ gap: 6 }}>
                  <RhoView
                    order={rho.order}
                    mu={rho.mu}
                    label={`${META[a].name} on the sequence`}
                    seen={a === 'cycle-hash' ? seenUpTo(trace.steps, f.step) : undefined}
                    at={f.snapshot?.at}
                    tortoise={f.snapshot?.tortoise}
                    hare={f.snapshot?.hare}
                  />
                  <span className="mono" style={{ fontSize: 13 }} data-testid={`result-${a}`}>
                    {done
                      ? `found μ = ${done.mu}, λ = ${done.lambda}`
                      : a === 'cycle-hash'
                        ? `${seenUpTo(trace.steps, f.step).size} values remembered`
                        : (f.snapshot?.phase ?? 'T moves one step, H moves two')}
                  </span>
                </div>
              );
            },
          }))}
        />
        <MemoryView rows={traces.map(({ a, trace }) => ({ label: META[a].name, counters: frameAt(trace, s).counters }))} />
      </div>

      <Timeline step={s} maxStep={maxStep} onStep={(v) => setStep(Math.min(v, maxStep))} />

      <section className="panel emphasis stack" aria-label="Scaling">
        <h2>Scaling: same time, different space</h2>
        {CYCLE_ALGOS.map((a) => (
          <PredictWidget
            key={`${a}-${yMetric}`}
            algorithm={`${META[a].name} (${yMetric === 'ops' ? 'time' : 'space'})`}
            value={predictions[`${a}-${yMetric}`]}
            onChange={(c) => predict(`${a}-${yMetric}`, c)}
            measured={series.find((x) => x.label === META[a].name)?.fit?.cls}
            disabled={benchRunning}
          />
        ))}
        <div className="controls">
          <button className="primary" onClick={runBench} disabled={benchRunning}>
            {benchRunning ? 'Running…' : 'Run scaling experiment'}
          </button>
          <label>
            Plot
            <select aria-label="Scaling metric" value={yMetric} onChange={(e) => setYMetric(e.target.value as YMetric)}>
              <option value="mem">Peak memory (space)</option>
              <option value="ops">Operations (time)</option>
            </select>
          </label>
        </div>
        <ScalingView series={series} domain={DOMAIN} xLabel="sequence length n = μ + λ" yLabel={Y_LABEL[yMetric]} />
        <p className="muted" style={{ margin: 0 }}>
          Both take O(n) steps. The hash set pays for its single pass with a cell for every value it has seen; Floyd
          keeps two pointers and two counters, whatever n is, and pays with a few more steps (about 3 to 7 per value
          instead of 3).
        </p>
      </section>
    </div>
  );
}
