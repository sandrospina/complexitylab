import { useId, useState } from 'react';
import { OP_KINDS } from '../engine/events';
import type { OpKind } from '../engine/events';
import type { Counters } from '../engine/instrument';

const BOOKKEEPING: ReadonlySet<OpKind> = new Set(['alloc', 'free', 'pushFrame', 'popFrame']);
const COUNTED = OP_KINDS.filter((k) => !BOOKKEEPING.has(k));
const TRACKED = OP_KINDS.filter((k) => BOOKKEEPING.has(k));

export const OP_LABEL: Record<OpKind, string> = {
  compare: 'compares',
  read: 'reads',
  write: 'writes',
  swap: 'swaps',
  clauseCheck: 'clause checks',
  decide: 'decisions',
  propagate: 'propagations',
  conflict: 'conflicts',
  alloc: 'allocations',
  free: 'frees',
  pushFrame: 'calls (frames pushed)',
  popFrame: 'returns (frames popped)',
};

export interface MemoryRow {
  label: string;
  counters: Counters;
}

function Meter({ label, value, peak, scale }: { label: string; value: number; peak: number; scale: number }) {
  const pct = scale > 0 ? Math.min(100, (value / scale) * 100) : 0;
  return (
    <>
      <span>{label}</span>
      <div className="bar" role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={scale}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <span className="mono">
        {value} <span className="muted">/ peak {peak}</span>
      </span>
    </>
  );
}

/**
 * Every operation kind, split into those the total counts and the bookkeeping it leaves
 * out (memory and call frames, measured separately as space). Kinds no row has used yet are
 * hidden unless `all` is set, so a sort does not list SAT's clause checks.
 */
function Breakdown({ rows, all }: { rows: MemoryRow[]; all: boolean }) {
  const used = (k: OpKind) => all || rows.some((r) => r.counters.ops[k] > 0);
  const group = (kinds: OpKind[], title: string, share: boolean) => {
    const shown = kinds.filter(used);
    if (shown.length === 0) return null;
    return (
      <tbody>
        <tr>
          <th scope="rowgroup" colSpan={rows.length + 1} className="muted breakdown-group">
            {title}
          </th>
        </tr>
        {shown.map((k) => (
          <tr key={k}>
            <th scope="row">{OP_LABEL[k]}</th>
            {rows.map(({ label, counters: c }) => (
              <td key={label} className="mono" data-testid={`op-${label}-${k}`}>
                {c.ops[k].toLocaleString('en-US')}
                {share && c.totalOps > 0 && c.ops[k] > 0 && (
                  <span className="muted"> {Math.round((100 * c.ops[k]) / c.totalOps)}%</span>
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    );
  };
  return (
    <table className="breakdown" aria-label="Operations by kind">
      {rows.length > 1 && (
        <thead>
          <tr>
            <th scope="col" />
            {rows.map((r) => (
              <th key={r.label} scope="col">
                {r.label}
              </th>
            ))}
          </tr>
        </thead>
      )}
      {group(COUNTED, 'Counted in the total', true)}
      {group(TRACKED, 'Bookkeeping, not in the total', false)}
    </table>
  );
}

/** Operation counts, memory cells and stack depth at the current instant, with a per-kind drill-down. */
export function MemoryView({ rows }: { rows: MemoryRow[] }) {
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  const id = useId();
  const memScale = Math.max(4, ...rows.map((r) => r.counters.peakMem));
  const stackScale = Math.max(4, ...rows.map((r) => r.counters.peakStack));
  return (
    <section className="panel" aria-label="Memory and operations">
      <h2>Memory &amp; operations</h2>
      {rows.map(({ label, counters: c }) => (
        <div className="mem-block" key={label}>
          <strong>{label}</strong>
          <div className="meter">
            <span>Operations</span>
            <span />
            <span className="mono" data-testid={`ops-${label}`}>
              {c.totalOps}
            </span>
            <Meter label="Memory cells" value={c.memCells} peak={c.peakMem} scale={memScale} />
            <Meter label="Stack frames" value={c.stackDepth} peak={c.peakStack} scale={stackScale} />
          </div>
        </div>
      ))}
      <div className="controls breakdown-controls">
        <button onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={id}>
          {open ? 'Hide breakdown' : 'Show breakdown'}
        </button>
        {open && (
          <label>
            <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Include unused kinds
          </label>
        )}
      </div>
      {open && (
        <div id={id}>
          <Breakdown rows={rows} all={all} />
        </div>
      )}
    </section>
  );
}
