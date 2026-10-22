import { useMemo } from 'react';
import { PRESETS } from '../../algorithms/sat/cnf';
import type { PresetId } from '../../algorithms/sat/cnf';
import { dpll } from '../../algorithms/sat/dpll';
import type { Heuristic, SatInput, SatResult, SatSnapshot } from '../../algorithms/sat/input';
import { replayDpll, replayTruthTable, rowAssignment } from '../../algorithms/sat/replay';
import { truthTable } from '../../algorithms/sat/truth-table';
import { buildCallTree } from '../../engine/calltree';
import type { CallNode } from '../../engine/calltree';
import { runTrace } from '../../engine/runner';
import type { TraceResult } from '../../engine/runner';
import { HEURISTICS, satAlgoId, useSatStore } from '../../store/sat';
import { CallTreeView } from '../../views/CallTreeView';
import { MemoryView } from '../../views/MemoryView';
import { RaceView } from '../../views/RaceView';
import { Timeline } from '../../views/Timeline';
import { frameAt } from '../../views/trace-frames';
import type { Frame } from '../../views/trace-frames';
import { useSolve } from '../../views/useSolve';
import type { Solve } from '../../views/useSolve';
import { ClauseEditor, DimacsBox, IncidenceGraph } from './ClauseEditor';

export const HEURISTIC_LABEL: Record<Heuristic, string> = {
  first: 'First unassigned variable',
  moms: 'MOMS (most occurrences in shortest clauses)',
  jw: 'Jeroslow–Wang (clauses weighted by 2^−size)',
};

const fmt = (x: number) => Math.round(x).toLocaleString('en-US');
const litText = (l: number) => `${l < 0 ? '¬' : ''}x${Math.abs(l)}`;

function TruthTableDrawing({ input, trace, frame }: { input: SatInput; trace: TraceResult<unknown>; frame: Frame<SatSnapshot> }) {
  const { n, clauses } = input.cnf;
  const { row, rows, fails } = replayTruthTable(clauses.length, trace.steps, frame.step);
  const total = 2 ** n;
  const a = rowAssignment(n, row);
  const most = Math.max(1, ...fails);
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="bar" role="meter" aria-label="Rows checked" aria-valuenow={rows} aria-valuemin={0} aria-valuemax={total}>
        <span style={{ width: `${(100 * rows) / total}%` }} />
      </div>
      <span className="mono" style={{ fontSize: 13 }}>
        row {fmt(Math.max(0, row))} of {fmt(total)}:{' '}
        {row >= 0 ? Array.from({ length: n }, (_, i) => (a[i + 1]! > 0 ? 1 : 0)).join('') : '—'}
      </span>
      <div className="heat" aria-label="How often each clause failed first">
        {fails.map((f, c) => (
          <span key={c} title={`C${c + 1}: first to fail in ${f} rows`} style={{ opacity: 0.12 + (0.88 * f) / most }} />
        ))}
      </div>
      <span className="muted" style={{ fontSize: 13 }}>
        Heat strip: which clause failed first in each row, darker = more often.
      </span>
    </div>
  );
}

function DpllDrawing({ input, trace, frame, nodes }: { input: SatInput; trace: TraceResult<unknown>; frame: Frame<SatSnapshot>; nodes: CallNode[] }) {
  const { trail } = replayDpll(input.cnf.n, trace.steps, frame.step);
  const finished = frame.step >= trace.steps.length && !trace.truncated;
  const model = finished && trace.result !== undefined;
  return (
    <div className="stack" style={{ gap: 6 }}>
      {nodes.length > 0 ? (
        <CallTreeView
          nodes={nodes}
          step={frame.step}
          noun="decisions"
          nodeText={(node) => node.label.replace(/^x(\d+)=1$/, '$1').replace(/^x(\d+)=0$/, '¬$1')}
          nodeClass={(node) => (node.ownOps > 0 ? 'conflict' : model && node.endStep === undefined ? 'model' : undefined)}
        />
      ) : (
        <p className="muted" style={{ margin: 0 }}>
          No decisions: propagation alone settles this formula.
        </p>
      )}
      <div className="trail" aria-label="Trail">
        {trail.length === 0 && <span className="muted">Trail empty</span>}
        {trail.map((t, i) => (
          <span key={i} className={`trail-entry ${t.reason === 'decision' ? 'decision' : 'forced'}`} title={t.reason}>
            {t.reason === 'decision' && i > 0 && <span className="level">level {t.level}</span>}
            <span className="mono">{litText(t.lit)}</span>
            <span className="muted">{t.reason === 'decision' ? 'decided' : t.reason}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Outcome({ label, solve, testid, decisions }: { label: string; solve: Solve<SatResult>; testid: string; decisions?: boolean }) {
  const done = solve.status === 'done' ? solve : undefined;
  return (
    <tr>
      <th scope="row">{label}</th>
      <td data-testid={`${testid}-result`}>
        {!done ? '…' : done.truncated ? 'stopped at budget' : done.result ? 'satisfiable' : 'unsatisfiable'}
      </td>
      <td className="mono">{done ? fmt(done.ops) : '…'}</td>
      <td className="mono" data-testid={`${testid}-decisions`}>
        {done && decisions ? fmt(done.counters.ops.decide) : done ? `${fmt(done.counters.ops.write)} rows` : '…'}
      </td>
    </tr>
  );
}

export function WorkspaceTab() {
  const { cnf, preset, seed, heuristic, propagate, pure, step } = useSatStore();
  const { loadPreset, setCnf, configure, setStep } = useSatStore.getState();
  const input = useMemo<SatInput>(() => ({ cnf, heuristic, propagate, pure }), [cnf, heuristic, propagate, pure]);
  const traces = useMemo(
    () => [
      { key: 'tt', name: 'Truth table', color: '#c2417a', trace: runTrace(truthTable, input) },
      { key: 'dpll', name: propagate ? 'DPLL' : 'Backtracking (no propagation)', color: '#2e9a6a', trace: runTrace(dpll, input) },
    ],
    [input, propagate],
  );
  const dpllTrace = traces[1]!.trace;
  const nodes = useMemo(() => buildCallTree(dpllTrace.steps, 'conflict'), [dpllTrace]);
  const tt = useSolve<SatResult>(satAlgoId('truth-table'), input);
  // Every DPLL spec runs the same generator; the options travel in the input.
  const full = useSolve<SatResult>(satAlgoId('dpll-first'), input);

  const maxStep = Math.max(...traces.map((t) => t.trace.steps.length));
  const s = Math.min(step, maxStep);
  const { a } = replayDpll(cnf.n, dpllTrace.steps, s);
  const small = cnf.n <= 12 && cnf.clauses.length <= 30;

  return (
    <div className="stack">
      <section className="panel controls" aria-label="Formula and solver">
        <label>
          Formula
          <select
            value={preset}
            onChange={(e) => e.target.value !== 'custom' && loadPreset(e.target.value as PresetId)}
          >
            {preset === 'custom' && <option value="custom">Your formula</option>}
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        {preset === 'random' && <button onClick={() => loadPreset('random', seed + 1)}>Another one</button>}
        <label>
          Decision heuristic
          <select value={heuristic} onChange={(e) => configure({ heuristic: e.target.value as Heuristic })}>
            {HEURISTICS.map((h) => (
              <option key={h} value={h}>
                {HEURISTIC_LABEL[h]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input type="checkbox" checked={propagate} onChange={(e) => configure({ propagate: e.target.checked })} /> Unit
          propagation
        </label>
        <label>
          <input type="checkbox" checked={pure} onChange={(e) => configure({ pure: e.target.checked })} /> Pure literals
        </label>
      </section>

      <div className="grid-2">
        <section className="panel stack" aria-label="Clause editor">
          <h2>Clauses, coloured by DPLL&apos;s assignment at this step</h2>
          <ClauseEditor cnf={cnf} assignment={a} onChange={setCnf} />
        </section>
        <div className="stack top">
          {small && (
            <section className="panel" aria-label="Incidence graph">
              <h2>Variables and clauses</h2>
              <IncidenceGraph cnf={cnf} assignment={a} />
            </section>
          )}
          <section className="panel stack" aria-label="DIMACS">
            <h2>DIMACS</h2>
            <DimacsBox key={JSON.stringify(cnf)} cnf={cnf} onImport={setCnf} />
          </section>
        </div>
      </div>

      <section className="panel stack" aria-label="Full runs">
        <h2>Full runs</h2>
        <table className="level-sums">
          <thead>
            <tr>
              <th scope="col" />
              <th scope="col">answer</th>
              <th scope="col">ops</th>
              <th scope="col">search</th>
            </tr>
          </thead>
          <tbody>
            <Outcome label="Truth table" solve={tt} testid="tt" />
            <Outcome label={propagate ? 'DPLL' : 'Backtracking'} solve={full} testid="dpll" decisions />
          </tbody>
        </table>
      </section>

      <div className="grid-2">
        <RaceView<SatSnapshot>
          step={s}
          metric="total"
          metricLabel="ops"
          entries={traces.map((t) => ({
            ...t,
            render: (f) =>
              t.key === 'tt' ? (
                <TruthTableDrawing input={input} trace={t.trace} frame={f} />
              ) : (
                <DpllDrawing input={input} trace={t.trace} frame={f} nodes={nodes} />
              ),
          }))}
        />
        <MemoryView rows={traces.map((t) => ({ label: t.name, counters: frameAt(t.trace, s).counters }))} />
      </div>
      <Timeline step={s} maxStep={maxStep} onStep={(v) => setStep(Math.min(v, maxStep))} />
    </div>
  );
}
