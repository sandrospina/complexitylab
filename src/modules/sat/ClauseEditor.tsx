import { useState } from 'react';
import { clauseStatus, parseDimacs, toDimacs } from '../../algorithms/sat/cnf';
import type { Assignment, Cnf } from '../../algorithms/sat/cnf';
import { MAX_VARS } from '../../store/sat';

const lit = (l: number) => `${l < 0 ? '¬' : ''}x${Math.abs(l)}`;

interface Props {
  cnf: Cnf;
  /** The assignment the clause colours follow. */
  assignment: Assignment;
  onChange: (cnf: Cnf) => void;
}

/** One row per clause: literal chips (click to negate, × to remove), add a literal, remove the clause. */
export function ClauseEditor({ cnf, assignment, onChange }: Props) {
  /** Applies a change to a copy of the clauses. */
  const edit = (f: (clauses: number[][]) => void) => {
    const clauses = cnf.clauses.map((c) => [...c]);
    f(clauses);
    onChange({ ...cnf, clauses });
  };
  const setN = (n: number) =>
    onChange({ n, clauses: cnf.clauses.map((c) => c.filter((l) => Math.abs(l) <= n)) });
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="controls">
        <label>
          Variables n
          <input
            type="number"
            min={1}
            max={MAX_VARS}
            value={cnf.n}
            onChange={(e) => setN(Math.max(1, Math.min(MAX_VARS, Number(e.target.value) || 1)))}
            style={{ width: 60 }}
          />
        </label>
        <span className="muted">
          {cnf.clauses.length} clauses, ratio {(cnf.clauses.length / cnf.n).toFixed(2)}
        </span>
      </div>
      <ol className="clauses" aria-label="Clauses">
        {cnf.clauses.map((c, ci) => {
          const status = clauseStatus(c, assignment);
          return (
            <li key={ci} className={`clause ${status}`} data-testid={`clause-${ci + 1}`} data-status={status}>
              <span className="mono muted">C{ci + 1}</span>
              {c.map((l, li) => (
                <span key={li} className="chip">
                  <button
                    className="mono"
                    onClick={() => edit((cs) => void (cs[ci]![li] = -l))}
                    aria-label={`Clause ${ci + 1}, literal ${lit(l)}: negate`}
                  >
                    {lit(l)}
                  </button>
                  <button onClick={() => edit((cs) => void cs[ci]!.splice(li, 1))} aria-label={`Remove ${lit(l)} from clause ${ci + 1}`}>
                    ×
                  </button>
                </span>
              ))}
              <select
                value=""
                aria-label={`Add a variable to clause ${ci + 1}`}
                onChange={(e) => edit((cs) => void cs[ci]!.push(Number(e.target.value)))}
              >
                <option value="">+</option>
                {Array.from({ length: cnf.n }, (_, i) => i + 1)
                  .filter((v) => !c.some((l) => Math.abs(l) === v))
                  .map((v) => (
                    <option key={v} value={v}>
                      x{v}
                    </option>
                  ))}
              </select>
              <button className="remove" onClick={() => edit((cs) => void cs.splice(ci, 1))} aria-label={`Remove clause ${ci + 1}`}>
                remove
              </button>
            </li>
          );
        })}
      </ol>
      <div>
        <button onClick={() => edit((cs) => void cs.push([1]))}>Add clause</button>
      </div>
      <p className="muted legend" style={{ margin: 0, fontSize: 13 }}>
        <span className="clause-key satisfied" /> satisfied <span className="clause-key falsified" /> falsified{' '}
        <span className="clause-key unit" /> unit (one literal left) <span className="clause-key open" /> open
      </p>
    </div>
  );
}

/** DIMACS import and export: the text always shows the current formula until edited. */
export function DimacsBox({ cnf, onImport }: { cnf: Cnf; onImport: (cnf: Cnf) => void }) {
  const [draft, setDraft] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const text = draft ?? toDimacs(cnf);
  return (
    <div className="stack" style={{ gap: 6 }}>
      <textarea
        className="mono dimacs"
        rows={8}
        value={text}
        onChange={(e) => setDraft(e.target.value)}
        aria-label="DIMACS CNF"
        spellCheck={false}
      />
      <div className="controls">
        <button
          onClick={() => {
            try {
              const parsed = parseDimacs(text);
              if (parsed.n > MAX_VARS) throw new Error(`at most ${MAX_VARS} variables in the workspace`);
              onImport(parsed);
              setDraft(undefined);
              setError(undefined);
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
          disabled={draft === undefined}
        >
          Import
        </button>
        <button onClick={() => {
            setDraft(undefined);
            setError(undefined);
          }} disabled={draft === undefined}>
          Discard changes
        </button>
        {error && (
          <span role="alert" className="error-text">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}

/** Variables above, clauses below; solid edges for positive literals, dashed for negated. */
export function IncidenceGraph({ cnf, assignment }: { cnf: Cnf; assignment: Assignment }) {
  const W = 600;
  const H = 150;
  const vx = (v: number) => ((v - 0.5) / cnf.n) * W;
  const cx = (c: number) => ((c + 0.5) / cnf.clauses.length) * W;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="tree-svg incidence" role="img" aria-label={`Incidence graph: ${cnf.n} variables, ${cnf.clauses.length} clauses`}>
      {cnf.clauses.flatMap((c, ci) =>
        c.map((l, k) => (
          <line key={`${ci}-${k}`} x1={vx(Math.abs(l))} y1={22} x2={cx(ci)} y2={H - 22} strokeDasharray={l < 0 ? '4 3' : undefined} />
        )),
      )}
      {Array.from({ length: cnf.n }, (_, i) => (
        <g key={`v${i}`} transform={`translate(${vx(i + 1)} 22)`} className={`var v${assignment[i + 1] ?? 0}`}>
          <circle r={11} />
          <text y={4} textAnchor="middle">
            {i + 1}
          </text>
        </g>
      ))}
      {cnf.clauses.map((c, ci) => (
        <rect key={`c${ci}`} x={cx(ci) - 7} y={H - 29} width={14} height={14} rx={3} className={`clause-node ${clauseStatus(c, assignment)}`} />
      ))}
    </svg>
  );
}
