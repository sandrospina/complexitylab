import { OP_KINDS } from '../engine/events';
import type { Counters } from '../engine/instrument';

const BOOKKEEPING = new Set(['alloc', 'free', 'pushFrame', 'popFrame']);
const COUNTED = OP_KINDS.filter((k) => !BOOKKEEPING.has(k));

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

/** Operation counts, memory cells and stack depth at the current instant. */
export function MemoryView({ rows }: { rows: MemoryRow[] }) {
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
            {COUNTED.filter((k) => c.ops[k] > 0 && c.ops[k] !== c.totalOps).map((k) => (
              <span key={k} style={{ display: 'contents' }}>
                <span className="muted">&nbsp;&nbsp;{k}</span>
                <span />
                <span className="mono muted">{c.ops[k]}</span>
              </span>
            ))}
            <Meter label="Memory cells" value={c.memCells} peak={c.peakMem} scale={memScale} />
            <Meter label="Stack frames" value={c.stackDepth} peak={c.peakStack} scale={stackScale} />
          </div>
        </div>
      ))}
    </section>
  );
}
