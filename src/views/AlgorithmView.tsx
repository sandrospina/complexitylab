import type { ReactNode } from 'react';
import type { TraceEvent } from '../engine/events';

interface Props {
  title: string;
  /** The event that produced the current frame, captioned under the drawing. */
  event?: TraceEvent;
  children: ReactNode;
}

function caption(e?: TraceEvent): string {
  if (!e) return 'Start';
  if (e.op === 'mark') return e.label ?? '';
  const where = e.indices?.length ? ` at [${e.indices.join(', ')}]` : '';
  const value = e.value !== undefined ? ` (value ${String(e.value)})` : '';
  const cells = e.cells !== undefined ? ` ${e.cells} cell${e.cells === 1 ? '' : 's'}` : '';
  const label = e.label ? ` ${e.label}` : '';
  return `${e.op}${cells}${where}${value}${label}`;
}

/** Frame for a module's own drawing of the algorithm, plus a caption of the current event. */
export function AlgorithmView({ title, event, children }: Props) {
  return (
    <section className="panel" aria-label={`${title} animation`}>
      <h2>{title}</h2>
      {children}
      <div className="event-caption muted mono" aria-live="polite">
        {caption(event)}
      </div>
    </section>
  );
}
