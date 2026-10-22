# Implementation milestones

Refines the eight milestones in [PLAN.md](PLAN.md). Every milestone runs on its own branch, starts in plan mode, writes algorithm tests before views, and closes only when its gate passes.

Adjustments to PLAN.md:
- Cross-cutting contracts (URL state, module registry, op budgets, curve fitting, predict-widget model) are built in M1, so M7/M8 add behaviour rather than retrofit it.
- Every milestone has a gate.
- M5's gate is a standalone SAT lecture, making the app classroom-usable after M5; M6 is the first cut if time runs short.

## Shared contracts (M1)
- `src/engine/events.ts`: `TraceEvent` — `op`, optional `indices`, `value`, `label`, `snapshot`, `cells`, `frame`, `parentFrame`.
- `src/engine/instrument.ts`: one method per op, counters (ops by kind, memory cells, stack depth, peaks), budgets that throw `BudgetExceeded`.
- `src/engine/runner.ts`: `runTrace` (events + counter snapshots, capped) and `runCount` (counters only).
- `src/engine/benchmark-core.ts` + `benchmark.worker.ts`: count-mode runs over a list of n, one point per n, stop at the first budget overrun.
- `src/engine/fit.ts`: weighted least squares against 1, log n, n, n log n, n², n³, 2ⁿ, n!; ranked fits and extrapolation.
- `src/modules/registry.ts` (React-free): algorithm specs with generator, input kinds, input maker, animation/benchmark caps, metric and expected class per input kind. The registry test checks every algorithm × input kind against its expected class.
- `src/store/url-state.ts`: every module mirrors its configuration into the URL.

## M1 — Engine and first vertical slice (search) ✅
Engine, linear/binary search, three synced views + timeline, race, predict widget, guess-my-number, growth-rate wall, CI with Pages deploy.
**Gate 1:** binary search steps, scrubs and benchmarks in the worker; fit selects log n; URL reproduces state; CI deploys.

## M2 — Sorting and recurrences ✅
Insertion, merge, quicksort (naive and random pivot); presets (random, sorted, reversed, few unique); adversary editor; recursion-tree view with per-level costs; master theorem explainer (KaTeX); shared RaceView; call-tree frames in the engine.
**Gate:** naive quicksort made quadratic in adversary mode; merge sort's recursion tree sums level by level to n log n.

## M3 — Time–space and graphs ✅
Fibonacci naive/memo/iterative with call-tree collapse (reuses `calltree.ts`); SVG graph editor with presets; BFS vs DFS memory; Dijkstra array vs binary heap with density slider.
**Tests:** BFS/DFS same visited set, O(V+E) ops; both Dijkstras agree; memo fib calls ≤ 2n.
**Gate:** Dijkstra crossover density visible on the scaling plot; BFS/DFS memory difference visible on wide vs deep graphs.
Notes: added fit classes O(φⁿ) (naive Fibonacci) and O(n² log n) (heap Dijkstra on complete graphs); the density control is an average-degree slider; benchmark graphs for Dijkstra use weights where every edge improves a distance (the heap's worst case), since random weights hide the crossover.

## M4 — The exponential wall ✅
Knapsack brute force vs DP with "add a bit"; TSP brute force, Held–Karp, nearest neighbour + 2-opt on a clickable map with optimality gap; verify-vs-solve page (Sudoku, subset sum). All exponential algorithms respect budgets; UI caps n.
**Tests:** knapsack variants agree; brute-force TSP = Held–Karp for n ≤ 9; heuristic ≥ optimum; checkers accept valid and reject mutated certificates.
**Gate 2:** all polynomial and exponential modules live, CI green, no UI freeze at max n.
Notes: Sudoku is generalised to r×c boxes; the checker is audited over board side s (O(s²)) and the backtracking solver over blank cells on a fixed 9×9, by the median of 64 puzzles (costs are heavy-tailed). The solver grows like ≈1.2ⁿ, so the fitter gained O(cⁿ) with a fitted base, chosen only when it beats every fixed class by 1.25× in error. Also new: O(n²·2ⁿ) for Held–Karp; NN + 2-opt measures O(n² log n). Full solves run in a solve worker; the gate test records no main-thread task over 50 ms at max n.

## M5 — SAT solvers ✅
CNF types, DIMACS, random k-SAT; clause editor with colouring and incidence graph; truth-table enumeration; DPLL with heuristics (first, MOMS, Jeroslow–Wang), propagation and pure-literal toggles, search tree and trail; experiments (scaling, phase transition, heuristic shoot-out) in the worker.
**Tests:** DPLL and truth-table agree on 1,000 random small formulas; models satisfy; DIMACS round-trips; pinned decision counts.
**Gate:** a standalone SAT lecture runs; phase-transition plot peaks near 4.26.
Notes: the lecture is a 7-step Lecture tab whose "Show me" buttons load each step's formula, settings and experiment. Audits: truth table O(2ⁿ) on ratio-10 (unsatisfiable) formulas; backtracking and DPLL O(cⁿ) at ratio 4.26 by the median of 64 formulas, measured from n = 20 because below that DPLL's cost is mostly per-node propagation (bases ≈ 1.46 backtracking, 1.13 first variable, 1.08 MOMS and Jeroslow–Wang). The phase transition runs at n = 40 on a 0.25 grid (n = 20 is too flat), with effort counted in decisions, since total ops keep growing with the clause count; measured peak 4.50, 50 % satisfiable at 4.35.

## M6 — Reductions to SAT
`encode` / `decode` / `verify` interface with clause-origin map; pipeline UI with two-way highlighting; 3-colouring, k-clique, Hamiltonian cycle, Sudoku, Tseitin (with circuit editor); clause counter with fitted polynomial; break-it mode; direction quiz; Cook–Levin teaser.
**Tests:** for all small instances, CNF satisfiable ⇔ brute force finds a solution; decoded solutions verify; clause counts match size formulas.
**Gate 3:** an instructor can run a full NP-completeness lecture from the app.

## M7 — Engagement layer
Predict-then-run scoring from fit residuals in every module; mystery-algorithm module; declarative challenge cards and badges (localStorage, guarded); data-driven guided tours; progressive disclosure.
**Gate:** every module has a tour, ≥ 2 challenges and prediction scoring.

## M8 — Classroom polish and release
URL state for all parameters and an instructor presets page; accessibility (keyboard, ARIA, colour-blind palette, axe in Playwright); performance budget with per-module code splitting; exercise sheet per module; student pilot.
**Release gate:** deployed and used by one course cohort.

## Stretch backlog
CDCL, WalkSAT, Karatsuba, bring-your-own-algorithm sandbox, vertex-cover 2-approximation, CSV/LTI export.
