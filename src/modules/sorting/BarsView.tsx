import type { SortSnapshot } from '../../algorithms/sort/input';
import type { TraceEvent } from '../../engine/events';

interface Props {
  arr: number[];
  event?: TraceEvent;
  snap?: SortSnapshot;
}

/** The array as bars: compared pair amber, moved elements accent, outside the active subarray dimmed. */
export function BarsView({ arr, event, snap }: Props) {
  const max = Math.max(1, ...arr);
  const touched = new Set(event?.indices ?? []);
  const moved = event?.op === 'swap' || event?.op === 'write';
  return (
    <div
      className="bars"
      role="img"
      aria-label={`Array: ${arr.join(', ')}${event?.indices ? `; ${event.op} at ${event.indices.join(' and ')}` : ''}`}
    >
      {arr.map((v, i) => {
        const cls = [
          snap?.lo === undefined || snap.hi === undefined || (i >= snap.lo && i <= snap.hi) ? 'in-range' : '',
          touched.has(i) ? (moved ? 'moved' : event?.op === 'compare' ? 'compare' : '') : '',
          snap?.pivot === i ? 'pivot' : '',
        ].join(' ');
        return <div key={i} className={cls} style={{ height: `${(v / max) * 100}%` }} title={String(v)} />;
      })}
    </div>
  );
}
