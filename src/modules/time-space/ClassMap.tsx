import type React from 'react';

export type ClassId = 'L' | 'NL' | 'P' | 'NP' | 'PSPACE' | 'EXPTIME';

/** Outermost first, with the examples this app measures. */
const SETS: { id: ClassId; name: string; examples: string }[] = [
  { id: 'EXPTIME', name: 'EXPTIME', examples: 'everything below; generalised chess and checkers are complete here' },
  { id: 'PSPACE', name: 'PSPACE = NPSPACE', examples: 'TQBF and Geography (complete); Savitch: NPSPACE = PSPACE' },
  { id: 'NP', name: 'NP', examples: 'SAT, Sudoku, subset sum, Hamiltonian cycle' },
  { id: 'P', name: 'P', examples: 'sorting, shortest paths, LCS' },
  { id: 'NL', name: 'NL', examples: 'directed reachability: is t reachable from s?' },
  { id: 'L', name: 'L', examples: "Floyd's cycle detection: O(1) pointers" },
];

/** The space and time classes as nested sets, with `highlight` (the current tab's class) picked out. */
export function ClassMap({ highlight }: { highlight?: ClassId }) {
  const nest = (k: number): React.ReactNode => {
    const set = SETS[k];
    if (!set) return null;
    return (
      <div className={`class-set${set.id === highlight ? ' now' : ''}`} role="listitem" aria-label={set.name}>
        <div>
          <strong>{set.name}</strong> <span className="muted">{set.examples}</span>
        </div>
        {k + 1 < SETS.length && <div role="list">{nest(k + 1)}</div>}
      </div>
    );
  };
  return (
    <details className="panel class-map">
      <summary>
        Where this sits: <span className="mono">L ⊆ NL ⊆ P ⊆ NP ⊆ PSPACE = NPSPACE ⊆ EXPTIME</span>
      </summary>
      <div role="list" aria-label="Complexity classes, each inside the next">
        {nest(0)}
      </div>
      <p className="muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
        Each class contains the one inside it. The hierarchy theorems prove NL ≠ PSPACE and P ≠ EXPTIME, so some
        inclusion in each chain is strict, but no single step is known to be: P vs NP and P vs PSPACE are both open.
      </p>
    </details>
  );
}
