import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { CLASS_LABEL, growth } from '../engine/complexity';
import type { Counters } from '../engine/instrument';
import { pseudocodeFor } from '../pseudocode';
import type { Pseudocode } from '../pseudocode/types';
import { Tex } from './Tex';

/** The TypeScript of every algorithm, loaded only when a student opens it. */
const SOURCES = import.meta.glob('../algorithms/**/*.ts', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;
const REPO = 'https://github.com/sandrospina/complexitylab/blob/main/src/algorithms/';

interface Props {
  algoId: string;
  /** Counters and the latest event's pseudocode line, at the current timeline step. */
  counters: Counters;
  line?: number;
  /** Input size, for the "measured at this n" check. */
  n: number;
  /** The run has reached its last step, so the counts are totals. */
  finished: boolean;
}

const fmt = (x: number) => x.toLocaleString('en-US');

function PseudocodeTab({ p, counters, line, n, finished }: Omit<Props, 'algoId'> & { p: Pseudocode }) {
  const dominant = p.dominant.reduce((s, k) => s + (counters.lines[k] ?? 0), 0);
  const f = growth(p.bound, Math.max(n, 2));
  return (
    <div className="stack" style={{ gap: 10 }}>
      <p style={{ margin: 0 }}>{p.idea}</p>
      <div className="table-scroll">
        <table className="pseudo" aria-label={`Pseudocode of ${p.title}`}>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">{p.title}</th>
              <th scope="col" title="Measured in this run, up to the current step">times run</th>
              <th scope="col">cost</th>
              <th scope="col" title="Worst case, in terms of n">times (formula)</th>
            </tr>
          </thead>
          <tbody>
            {p.lines.flatMap((l, i) => {
              const k = i + 1;
              const count = counters.lines[k] ?? 0;
              const rows = [];
              if (l.section)
                rows.push(
                  <tr key={`s${k}`} className="pseudo-section">
                    <td />
                    <td colSpan={4} className="mono">
                      {l.section}
                    </td>
                  </tr>,
                );
              rows.push(
                <tr key={k} className={`${line === k ? 'now' : ''}${p.dominant.includes(k) ? ' dominant' : ''}`} data-testid={`pseudo-line-${k}`}>
                  <td className="mono muted">{k}</td>
                  <td>
                    <div className="mono pseudo-code" style={{ paddingLeft: `${l.depth * 1.4}em` }}>
                      {l.code}
                    </div>
                    <div className="muted pseudo-note" style={{ paddingLeft: `${l.depth * 1.4}em` }}>
                      {l.note}
                    </div>
                  </td>
                  <td className="mono" data-testid={`pseudo-count-${k}`}>
                    {fmt(count)}
                    {l.unit && <span className="muted"> {l.unit}</span>}
                  </td>
                  <td>{l.cost && <Tex tex={l.cost} />}</td>
                  <td>{l.times && <Tex tex={l.times} />}</td>
                </tr>,
              );
              return rows;
            })}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        The highlighted line is the one the current step executes. &ldquo;Times run&rdquo; is counted from this run;
        the formula column is the worst case. Bold lines are the ones that decide the growth class.
      </p>
      <section className="stack derivation" aria-label="How the complexity follows" style={{ gap: 8 }}>
        <strong>How the complexity follows from the counts</strong>
        {p.derivation.map((d) => (
          <div key={d.label} className="stack" style={{ gap: 4 }}>
            <span>
              <em>{d.label}</em>
            </span>
            <Tex block tex={d.tex} />
            <span className="muted">{d.text}</span>
          </div>
        ))}
        <p style={{ margin: 0 }} data-testid="pseudo-measured">
          Measured {finished ? 'in this run' : 'so far'}, n = {n}: the bold lines ran{' '}
          <strong className="mono">{fmt(dominant)}</strong> times{finished && f > 0 && p.bound !== 'expc' && (
            <>
              {' '}= <strong className="mono">{(dominant / f).toPrecision(3)}</strong> · <Tex tex={TEX_OF[p.bound]} />
            </>
          )}
          .{' '}
          {!finished
            ? 'Run to the end for the total.'
            : p.bound === 'expc'
              ? 'The base c of this exponential is fitted from many runs: see the scaling plot.'
              : `Change n and run again: if the algorithm is ${CLASS_LABEL[p.bound]} on this input, the factor stays roughly constant.`}
        </p>
      </section>
    </div>
  );
}

const TEX_OF: Record<Pseudocode['bound'], string> = {
  '1': '1',
  loglogn: '\\log_2\\log_2 n',
  logn: '\\log_2 n',
  sqrtn: '\\sqrt n',
  n: 'n',
  nlogn: 'n\\log_2 n',
  n2: 'n^2',
  n2logn: 'n^2\\log_2 n',
  n3: 'n^3',
  expc: 'c^n',
  expPhi: '\\varphi^n',
  exp2: '2^n',
  n2exp2: 'n^2 2^n',
  fact: 'n!',
};

const KEYWORDS = new Set(['const', 'let', 'var', 'function', 'yield', 'return', 'if', 'else', 'for', 'while', 'do', 'break', 'continue', 'export', 'import', 'from', 'type', 'interface', 'new', 'of', 'in', 'true', 'false', 'undefined', 'null', 'async', 'await']);

/** A tiny TypeScript highlighter: comments, strings, keywords and numbers. */
function highlight(code: string) {
  const out: ReactNode[] = [];
  const token = /(\/\/.*$|\/\*.*?\*\/|'(?:\\.|[^'])*'|`(?:\\.|[^`])*`|"(?:\\.|[^"])*"|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b)/g;
  let last = 0;
  for (const m of code.matchAll(token)) {
    const t = m[0];
    if (m.index! > last) out.push(code.slice(last, m.index));
    const cls = t.startsWith('//') || t.startsWith('/*') ? 'tk-comment' : /^['"`]/.test(t) ? 'tk-string' : /^\d/.test(t) ? 'tk-number' : KEYWORDS.has(t) ? 'tk-keyword' : '';
    out.push(cls ? <span key={m.index} className={cls}>{t}</span> : t);
    last = m.index! + t.length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

/** Whether a source line carries the tag for pseudocode line k. */
const tags = (src: string, k: number) => {
  const m = /line: ([^,}\n]+)|ins\.at\(([^)]+)\)|(?:true|false), (\d+)\)|(?:less|put)\([^,]+, [^,]+, (\d+)|const line = ([^;\n]+)|yield\* push\([^;]*, (\d+)\);/.exec(src);
  if (!m) return false;
  const expr = m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5] ?? m[6]!;
  return [...expr.matchAll(/\b\d+\b/g)].some((d) => Number(d[0]) === k);
};

function SourceTab({ files, line }: { files: string[]; line?: number }) {
  const [texts, setTexts] = useState<Record<string, string>>({});
  useEffect(() => {
    let live = true;
    for (const f of files) {
      const load = SOURCES[`../algorithms/${f}`];
      load?.().then((t) => live && setTexts((s) => ({ ...s, [f]: t })));
    }
    return () => {
      live = false;
    };
  }, [files]);
  return (
    <div className="stack" style={{ gap: 10 }}>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        The code the animation is running. Each step reports itself through the instrument <code>ins</code>; the
        <code> line:</code> tags and <code>ins.at(…)</code> calls tie it to the pseudocode, and the lines for the current
        pseudocode line are highlighted.
      </p>
      {files.map((f) => (
        <div key={f} className="stack" style={{ gap: 4 }}>
          <span className="mono">
            src/algorithms/{f}{' '}
            <a href={REPO + f} target="_blank" rel="noreferrer">
              view on GitHub
            </a>
          </span>
          {texts[f] === undefined ? (
            <span className="muted">Loading…</span>
          ) : (
            <pre className="source" aria-label={`Source of ${f}`}>
              {texts[f]!.split('\n').map((src, i) => (
                <div key={i} className={line !== undefined && tags(src, line) ? 'now' : undefined} data-testid={line !== undefined && tags(src, line) ? 'source-now' : undefined}>
                  <span className="ln">{i + 1}</span>
                  {highlight(src)}
                </div>
              ))}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

/** "Show code": the algorithm's pseudocode with measured line counts, or its TypeScript. */
export function CodePanel(props: Props) {
  const p = pseudocodeFor(props.algoId);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'pseudo' | 'ts'>('pseudo');
  if (!p) return null;
  return (
    <div className="stack code-panel" style={{ gap: 8 }}>
      <div className="controls">
        <button onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? 'Hide code' : 'Show code'}
        </button>
        {open && (
          <div className="tabs" role="tablist" aria-label="Code view">
            <button role="tab" aria-selected={tab === 'pseudo'} onClick={() => setTab('pseudo')}>
              Pseudocode
            </button>
            <button role="tab" aria-selected={tab === 'ts'} onClick={() => setTab('ts')}>
              TypeScript
            </button>
          </div>
        )}
      </div>
      {open && (tab === 'pseudo' ? <PseudocodeTab p={p} {...props} /> : <SourceTab files={p.sources} line={props.line} />)}
    </div>
  );
}
