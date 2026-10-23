import { ROUTES } from './routes';

export const SITE_TITLE = 'Complexity Lab :: Sandro Spina, Dept. of Computer Science';

/** What each module is for, in one line. */
const ABOUT: Record<string, string> = {
  search: 'Linear, binary, jump and interpolation search: O(n), O(log n), O(√n) and O(log log n) side by side.',
  sorting: 'Six sorts raced on one input, an adversary that builds worst cases, and recursion trees with the master theorem.',
  'time-space': 'Trading time for space: Fibonacci with and without memo, cycle detection, and LCS in n² or n cells.',
  graphs: 'BFS vs DFS memory on wide and deep graphs; Dijkstra with an array vs a binary heap as density changes.',
  knapsack: 'Brute force vs dynamic programming, and why O(n·W) is only pseudo-polynomial.',
  tsp: 'The factorial wall: brute force, Held–Karp and a heuristic on a map you draw, with the optimality gap.',
  verify: 'Checking an answer vs finding one: Sudoku and subset sum.',
  sat: 'Truth tables vs DPLL, the phase transition at 4.26, and a lecture on SAT.',
  reductions: 'Reductions to SAT from colouring, cliques, Hamiltonian cycles, Sudoku and circuits; Cook–Levin; a lecture.',
  'growth-wall': 'How large an input each growth rate can handle in a second, a day, or the age of the universe.',
};

export function Home({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <div className="stack">
      <section className="panel stack home-intro" aria-label="About">
        <h2>Complexity Lab</h2>
        <p style={{ margin: 0 }}>
          <strong>Sandro Spina</strong>, Department of Computer Science, University of Malta
        </p>
        <p style={{ margin: 0 }}>
          An interactive lab for a course on algorithmic complexity. Every algorithm here counts its own operations and
          memory as it runs: step through it, race it against another, then measure how its cost grows with the input
          and see which growth class fits. Predict first, then run.
        </p>
      </section>
      <div className="home-grid">
        {ROUTES.map((r) => (
          <button key={r.id} className="panel home-card" onClick={() => onOpen(r.id)} aria-label={`Open ${r.title}`}>
            <strong>{r.title}</strong>
            <span className="muted">{ABOUT[r.id] ?? ''}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
