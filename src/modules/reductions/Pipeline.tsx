import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Encoding, Reduction, Ref, Violation } from '../../algorithms/reductions/types';
import { encodeCnf, toDimacs } from '../../algorithms/sat/cnf';
import type { SatInput, SatResult } from '../../algorithms/sat/input';
import { runCount } from '../../engine/runner';
import { MAX_VARS } from '../../store/sat';
import { useSolve } from '../../views/useSolve';

export const sameRef = (a: Ref, b: Ref) => a.kind === b.kind && a.id === b.id;
export const hasRef = (refs: Ref[], r: Ref | undefined) => r !== undefined && refs.some((x) => sameRef(x, r));

export interface DrawProps<S> {
  solution: S | undefined;
  violations: Violation[];
  /** Parts to emphasise: those the hovered clause or violation mentions. */
  lit: Ref[];
  onHover: (ref: Ref | undefined) => void;
}

interface Props<I, S> {
  reduction: Reduction<I, S>;
  instance: I;
  omit: string[];
  setOmit: (omit: string[]) => void;
  draw: (p: DrawProps<S>) => ReactNode;
  /** What "unsatisfiable" means here, e.g. "the graph has no Hamiltonian cycle". */
  noSolution: string;
  /** What a decoded solution is called, e.g. "colouring". */
  solutionName: string;
}

const CLAUSES_SHOWN = 6;
const fmt = (x: number) => x.toLocaleString('en-US');

/** "x3,1" for variable 10, from its label "x3,1: vertex 3 has colour 2". */
const short = (e: Encoding, lit: number) => `${lit < 0 ? '¬' : ''}${e.vars[Math.abs(lit) - 1]!.label.split(':')[0]}`;

const LITERALS_SHOWN = 6;

/** A clause as text; long ones (like "accept somewhere") show their first literals and a count. */
function clauseText(e: Encoding, clause: number[]): string {
  const shown = clause.slice(0, LITERALS_SHOWN).map((l) => short(e, l)).join(' ∨ ');
  return clause.length > LITERALS_SHOWN ? `(${shown} ∨ … ${clause.length} literals)` : `(${shown})`;
}

/**
 * The three stages of a reduction: encode the instance as CNF (dropping any families the
 * student unticks), solve it with DPLL in a worker, decode the model and verify it.
 */
export function Pipeline<I, S>({ reduction, instance, omit, setOmit, draw, noSolution, solutionName }: Props<I, S>) {
  const encoding = useMemo(() => runCount(reduction.encode, { instance, omit }).result!, [reduction, instance, omit]);
  // Break-it mode uses the plainest solver (first variable, true first), which takes any shortcut the clauses leave.
  const input = useMemo<SatInput>(
    () => ({ cnf: encoding.cnf, heuristic: omit.length ? 'first' : 'jw', propagate: true, pure: false }),
    [encoding, omit],
  );
  const solve = useSolve<SatResult>('sat/dpll-jw', input);
  const [hoverClause, setHoverClause] = useState<number | undefined>();
  const [hoverRef, setHoverRef] = useState<Ref | undefined>();
  const [hoverViolation, setHoverViolation] = useState<Violation | undefined>();

  const done = solve.status === 'done' ? solve : undefined;
  const solution = done?.result ? reduction.decode(instance, done.result) : undefined;
  const violations = solution ? reduction.verify(instance, solution) : [];
  const size = reduction.size(instance);
  const lit = hoverViolation?.refs ?? (hoverClause !== undefined ? encoding.origins[hoverClause]!.refs : hoverRef ? [hoverRef] : []);
  const total = encoding.cnf.clauses.length;

  const byFamily = useMemo(() => {
    const m = new Map<string, number[]>();
    encoding.origins.forEach((o, i) => m.set(o.family, [...(m.get(o.family) ?? []), i]));
    return m;
  }, [encoding]);

  const download = () => {
    const url = URL.createObjectURL(new Blob([toDimacs(encoding.cnf)], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reduction.id}.cnf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="stack">
      <div className="grid-2 even">
        <section className="panel stack top" aria-label="Instance">
          <h2>1 · The instance</h2>
          {draw({ solution, violations, lit, onHover: setHoverRef })}
        </section>

        <section className="panel stack top" aria-label="Encoding">
          <h2>2 · Encoded as CNF</h2>
          <p style={{ margin: 0 }}>
            <strong className="mono" data-testid="var-count">
              {fmt(encoding.cnf.n)}
            </strong>{' '}
            variables,{' '}
            <strong className="mono" data-testid="clause-count">
              {fmt(total)}
            </strong>{' '}
            clauses.
          </p>
          <div className="families">
            {reduction.families.map((f) => {
              const on = !omit.includes(f.id);
              const ids = byFamily.get(f.id) ?? [];
              const touching = hoverRef ? ids.filter((i) => hasRef(encoding.origins[i]!.refs, hoverRef)) : ids;
              return (
                <div key={f.id} className={`family${on ? '' : ' off'}`}>
                  <label>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => setOmit(on ? [...omit, f.id] : omit.filter((x) => x !== f.id))}
                      aria-label={`Keep the clauses: ${f.label}`}
                    />{' '}
                    {f.label}
                  </label>
                  <span className="mono muted" data-testid={`family-${f.id}`}>
                    {on ? fmt(encoding.counts[f.id] ?? 0) : `0 of ${fmt(size.families[f.id] ?? 0)}`}
                  </span>
                  {on && touching.length > 0 && (
                    <div className="clause-sample">
                      {touching.slice(0, CLAUSES_SHOWN).map((i) => (
                        <code
                          key={i}
                          className={hoverClause === i ? 'lit' : undefined}
                          onMouseEnter={() => setHoverClause(i)}
                          onMouseLeave={() => setHoverClause(undefined)}
                          tabIndex={0}
                          onFocus={() => setHoverClause(i)}
                          onBlur={() => setHoverClause(undefined)}
                          data-testid="clause"
                        >
                          {clauseText(encoding, encoding.cnf.clauses[i]!)}
                        </code>
                      ))}
                      {touching.length > CLAUSES_SHOWN && (
                        <span className="muted">
                          … {fmt(touching.length - CLAUSES_SHOWN)} more{hoverRef ? ' touching this' : ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Hover a clause to see what it constrains; hover the instance to see its clauses. Untick a family to see what
            breaks without it.
          </p>
          <div className="controls">
            <button onClick={download}>Download DIMACS</button>
            {encoding.cnf.n <= MAX_VARS && (
              <a href={`?m=sat&tab=workspace&f=${encodeURIComponent(encodeCnf(encoding.cnf))}`}>Open in the SAT module</a>
            )}
          </div>
        </section>
      </div>

      <section className="panel stack" aria-label="Solve and decode">
        <h2>3 · Solved by DPLL, decoded and checked</h2>
        <p style={{ margin: 0 }} role="status">
          {!done ? (
            'Solving…'
          ) : done.truncated ? (
            'The solver stopped at its budget.'
          ) : !done.result ? (
            <strong data-testid="verdict" data-verdict="unsat">
              Unsatisfiable: {noSolution}.
            </strong>
          ) : violations.length === 0 ? (
            <strong className="status-ok" data-testid="verdict" data-verdict="valid">
              Satisfiable, and the decoded {solutionName} checks out.
            </strong>
          ) : (
            <strong className="error-text" data-testid="verdict" data-verdict="invalid">
              Satisfiable, but the decoded {solutionName} is wrong:
            </strong>
          )}{' '}
          {done && !done.truncated && (
            <span className="muted">
              {fmt(done.counters.ops.decide)} decisions, {fmt(done.counters.ops.propagate)} propagations,{' '}
              {fmt(done.counters.ops.conflict)} conflicts.
            </span>
          )}
        </p>
        {violations.length > 0 && (
          <ul className="violations">
            {violations.slice(0, 12).map((v, i) => (
              <li key={i} onMouseEnter={() => setHoverViolation(v)} onMouseLeave={() => setHoverViolation(undefined)} data-testid="violation">
                {v.message} <span className="muted">(needs: {reduction.families.find((f) => f.id === v.family)?.label})</span>
              </li>
            ))}
            {violations.length > 12 && <li className="muted">… {violations.length - 12} more</li>}
          </ul>
        )}
      </section>
    </div>
  );
}
