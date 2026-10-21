import type { ReactNode } from 'react';
import type { OpKind } from '../engine/events';
import type { TraceResult } from '../engine/runner';
import { AlgorithmView } from './AlgorithmView';
import { frameAt } from './trace-frames';
import type { Frame } from './trace-frames';

export interface RaceEntry<S> {
  key: string;
  name: string;
  color: string;
  trace: TraceResult<unknown>;
  render: (frame: Frame<S>) => ReactNode;
}

interface Props<S> {
  step: number;
  entries: RaceEntry<S>[];
  /** The count compared head to head, e.g. 'compare'. */
  metric: OpKind | 'total';
  metricLabel: string;
}

/** One or more algorithms animated in lock-step on the same timeline, with a live head-to-head count. */
export function RaceView<S>({ step, entries, metric, metricLabel }: Props<S>) {
  const frames = entries.map((e) => ({ entry: e, frame: frameAt<S>(e.trace, step) }));
  const count = (f: Frame<S>) => (metric === 'total' ? f.counters.totalOps : f.counters.ops[metric]);
  return (
    <div className="stack">
      {frames.length > 1 && (
        <div className="panel controls" aria-live="polite" data-testid="race-score">
          {frames.map(({ entry, frame }) => (
            <span key={entry.key}>
              <span style={{ color: entry.color }}>●</span> {entry.name}:{' '}
              <strong className="mono">{count(frame)}</strong> {metricLabel}
              {frame.step >= entry.trace.steps.length && <span className="muted"> (finished)</span>}
            </span>
          ))}
        </div>
      )}
      {frames.map(({ entry, frame }) => (
        <AlgorithmView key={entry.key} title={entry.name} event={frame.event}>
          {entry.render(frame)}
        </AlgorithmView>
      ))}
    </div>
  );
}
