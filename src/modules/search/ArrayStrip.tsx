import type { SearchInput, SearchSnapshot } from '../../algorithms/search/input';

/** The sorted array, greying out cells binary search has already ruled out. */
export function ArrayStrip({ input, snap }: { input: SearchInput; snap?: SearchSnapshot }) {
  return (
    <div>
      <p style={{ margin: '0 0 6px' }}>
        Looking for <strong className="mono">{input.target}</strong>
      </p>
      <div className="array-strip" role="list">
        {input.arr.map((v, i) => {
          const out = snap?.lo !== undefined && snap.hi !== undefined && (i < snap.lo || i > snap.hi);
          const cls = snap?.found === i ? 'found' : snap?.i === i ? 'current' : out ? 'out' : '';
          return (
            <div key={i} role="listitem" className={`cell ${cls}`} aria-label={`index ${i}, value ${v}${cls ? `, ${cls}` : ''}`}>
              {v}
            </div>
          );
        })}
      </div>
    </div>
  );
}
