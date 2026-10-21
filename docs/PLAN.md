# Complexity Explorer — Project Plan

Oct 21, 2026 · @Sandro

## Vision and learning goals

Complexity Explorer is a browser-based lab where students run algorithms step by step, watch time and memory grow, and test their own predictions against measured curves. Every module ends with the student, not the page, stating the complexity.

The guiding idea: complexity is learned by being surprised. Students should guess, run, and see the guess fail before the formula is introduced.

By the end of the course a student should be able to:

1. Derive and read asymptotic bounds (O, Θ, Ω) and connect them to measured operation counts.
2. Separate best, average and worst case, and build inputs that trigger each.
3. Reason about time–space trade-offs, including recursion stack cost.
4. Solve recurrences with recursion trees and the master theorem.
5. Explain why polynomial vs exponential is the line that matters, and what pseudo-polynomial means.
6. Distinguish solving from verifying, and state what NP and NP-complete mean.
7. Construct a polynomial reduction from a graph or puzzle problem to SAT and decode the answer back.
8. Explain why DPLL-style solvers beat brute force in practice despite an exponential worst case.

## Algorithm selection

Each concept gets the pair or trio of algorithms that makes the contrast most visible on screen, not the most complete catalogue. Algorithms are chosen so that a single slider on input size n produces a dramatic, explainable difference.

| # | Concept taught | Algorithms | Why this choice | Signature interaction |
| --- | --- | --- | --- | --- |
| 1 | O(n) vs O(log n) | Linear search, binary search | Smallest possible example of halving; the log curve looks almost flat beside the line | “Guess my number”: student plays against binary search and counts guesses |
| 2 | O(n²) vs O(n log n); best/avg/worst case | Insertion sort, merge sort, quicksort (naive and random pivot) | One problem, three behaviours; quicksort flips from n log n to n² on sorted input | Adversary mode: student edits the input to maximise comparisons |
| 3 | Recurrences, master theorem | Merge sort, binary search recursion trees | Tree width × depth makes n log n visible as area | Expand the recursion tree level by level and sum cost per level |
| 4 | Time–space trade-off | Fibonacci: naive recursion, memoised, iterative | Exponential → linear time by spending memory; stack depth visible | Watch the call tree collapse when memo is switched on |
| 5 | Graph complexity O(V+E), memory profiles | BFS vs DFS | Same time, very different memory on wide vs deep graphs | Draw a graph; compare frontier size vs stack depth |
| 6 | Data structures change complexity | Dijkstra with array vs binary heap | Crossover point between dense and sparse graphs | Edge-density slider moves the crossover live |
| 7 | Exponential vs pseudo-polynomial | 0/1 knapsack: brute force 2ⁿ vs DP O(nW) | DP looks polynomial until you add bits to W | “Add a bit” button doubles W and the DP table |
| 8 | Factorial blow-up; exact vs heuristic | TSP: brute force O(n!), Held–Karp O(n²2ⁿ), nearest neighbour + 2-opt | Shows the wall, a smarter exponential, and a fast but inexact escape | Click cities on a map; race the three; show the optimality gap |
| 9 | Verify vs solve (P vs NP) | Sudoku and subset sum: check a certificate vs search | Checking is instant, solving is not | Student solves a puzzle while a timer shows the checker’s cost |
| 10 | NP-completeness by reduction | 3-colouring, k-clique, Hamiltonian cycle, Sudoku → SAT; circuit → 3-SAT (Tseitin) | Graph problems map cleanly to clauses; Sudoku is the crowd-pleaser | Edit the graph and watch clauses appear and disappear |
| 11 | SAT: naive vs heuristic search | Truth-table enumeration, backtracking, DPLL; CDCL and WalkSAT as stretch | Same formula, orders of magnitude fewer nodes visited | Step through decisions, unit propagation and backtracks on a search tree |

A “growth-rate wall” page ties all modules together: for each complexity class it shows the largest n solvable in 1 second, 1 day and the age of the universe at 10⁹ operations per second.

Sorting is not strictly search or optimisation, but it is kept because it is the clearest vehicle for best/worst case and recurrences; it can be trimmed if the course already covers it.

## Core interaction design

Every module uses the same three-view page, driven by one recorded trace, so students learn the interface once and then focus on the algorithms. Scrubbing the timeline moves all three views together: the animation, the memory in use at that instant, and the point on the scaling curve.

&#91;embedded content: module page layout · three views + controls\]

The scaling view is the payoff of each module, so it is visually emphasised; the algorithm view earns curiosity, the scaling view delivers the insight.

**Engagement mechanics**

| Mechanic | How it works | Concept it reinforces |
| --- | --- | --- |
| Predict, then run | Before a scaling run the student sketches or picks the expected curve; the app scores the fit and reveals the truth | Asymptotic reasoning before measurement |
| Race mode | Two algorithms on the same input, animated in lock-step with live counters | Constant factors vs growth rate |
| Adversary challenges | Student edits the input to maximise operations (e.g. make quicksort quadratic) | Worst-case inputs |
| Mystery algorithm | A black-box algorithm; student probes it with chosen n and inputs, then classifies its complexity | Empirical complexity analysis |
| Growth-rate wall | Pick a class, see the largest solvable n for a second, a day, the age of the universe | Why exponential is a wall |
| Challenge cards + badges | Short goals per module, e.g. “find the Dijkstra crossover density” or “build a 20-variable formula needing 1,000+ DPLL decisions” | Active exploration |
| Guided tour, then sandbox | 3–5 step walkthrough per module, then free play | Low entry barrier |
| Shareable state URLs | Every configuration encodes into the URL for lectures and exercises | Instructor reuse |

## SAT module

The SAT module is the centrepiece: one CNF formula, two solvers side by side, and a counter that makes the gap undeniable. Students edit formulas directly or receive them from the reductions module.

**Formula workspace**

- Clause editor with literal chips (click to negate), plus DIMACS CNF import/export.
- Clause list colours live: satisfied (green), falsified (red), unit (amber), open (grey).
- Variable-clause incidence graph view for small formulas.

**Solver 1 — naive enumeration**

- Walks the truth table in binary order; each row is a full assignment evaluated against every clause.
- Visual: a progress bar over 2ⁿ rows and a heat strip of which clause failed first.
- Teaching point: cost is 2ⁿ × m clause checks regardless of structure; memory is O(n).

**Solver 2 — DPLL**

1. Decide: pick a variable with a heuristic (selectable: first unassigned, most occurrences / MOMS, Jeroslow–Wang).
2. Unit propagation: forced assignments shown as a chain on the trail with the clause that forced each one.
3. Pure literal elimination (toggle).
4. Conflict: highlight the empty clause, backtrack, flip the last decision.

Visuals: a binary search tree that grows as decisions are made (pruned branches greyed), the assignment trail as a stack (decision levels separated), and counters for decisions, propagations, conflicts and clause visits. Toggling propagation off reduces DPLL to plain backtracking, so students see exactly what each heuristic buys.

**Experiments**

- Scaling: random 3-SAT at a fixed clause/variable ratio, n from 5 to \~60; log-scale plot of nodes visited for each solver.
- Phase transition: sweep the clause/variable ratio from 2 to 7 and plot % satisfiable and median solver effort; the hardness peak near 4.26 surprises almost everyone.
- Heuristic shoot-out: same formula set, different decision heuristics, ranked by nodes visited.

**Stretch:** CDCL with an implication graph, learned clauses and non-chronological backjumps; WalkSAT as an incomplete local-search contrast.

## NP-completeness module: reductions to SAT

Every reduction runs as a three-stage pipeline the student can watch: encode the instance as CNF, solve with the SAT module, decode the assignment back onto the original picture. Hovering any clause highlights the vertex, edge or cell it came from, and vice versa.

| Reduction | Variables | Clause families | Size | What it teaches |
| --- | --- | --- | --- | --- |
| Graph 3-colouring → SAT | x(v,c): vertex v has colour c | each vertex gets ≥1 colour; at most 1 colour; adjacent vertices differ | 3V vars, O(V + E) clauses | The cleanest first reduction; colours appear on the graph when solved |
| k-clique → SAT | x(i,v): v is the i-th clique member | each slot filled; no vertex used twice; non-adjacent pairs excluded | kV vars, O(k²V²) clauses | Encoding “not an edge” constraints; growth with k |
| Hamiltonian cycle → SAT | x(v,p): v at position p | each position one vertex; each vertex one position; consecutive positions adjacent | V² vars, O(V³) clauses | Polynomial but visibly large blow-up; why reductions must stay polynomial |
| Sudoku → SAT | x(r,c,d): cell holds digit d | cell, row, column, box constraints + givens | 729 vars, \~12k clauses | Real-world feel; DPLL solves it mostly by unit propagation |
| Circuit-SAT → 3-SAT (Tseitin) | one var per gate output | 3-clauses per gate | linear in circuit size | Why 3-SAT is as hard as SAT; links to Cook–Levin |

Interactive features:

- A “clause counter” next to the graph editor: adding one vertex shows exactly how many variables and clauses appear, with a fitted polynomial.
- Break-it mode: student removes a clause family, the solver returns an invalid colouring or cycle, and the decoder flags the violation.
- Direction check quiz: “To prove X is NP-hard, which way does the reduction go?” shown with arrows the student drags.
- A Cook–Levin teaser page: a tiny Turing-machine-style tableau encoded as clauses, explained at intuition level only.

## Tech stack and architecture

A static TypeScript single-page app with no backend: every algorithm is written once as an instrumented generator and reused for both animation and benchmarking. That single decision keeps the visuals and the measured curves consistent and makes Claude Code sessions predictable.

&#91;embedded content: architecture · 4 layers, one shared algorithm library\]

**Key decisions**

- **Operation counts, not wall-clock time.** Counts are deterministic, browser-independent and map directly onto the textbook bound. Memory is counted in abstract cells and stack frames.
- **Generators as the algorithm contract.** `function* binarySearch(arr, target, ins)` yields events; the runner decides whether to keep them (trace) or only count (benchmark).
- **Own SAT solvers in TypeScript.** Readability and step events matter more than speed here; instances stay small enough for teaching.
- **Static hosting** on GitHub Pages or a university server; student progress and badges stay in the browser, so no accounts or personal data.

| Layer | Choice |
| --- | --- |
| Build and language | Vite, TypeScript (strict) |
| UI | React, Zustand for state |
| Plots and drawings | D3 or Observable Plot (scaling view), SVG for small animations, Canvas for large arrays |
| Maths display | KaTeX for formulas and recurrences |
| Tests | Vitest (algorithms, reductions), Playwright (module walkthroughs) |
| CI and deploy | GitHub Actions → GitHub Pages |

**Suggested folder structure**

```
src/
  engine/        events.ts, instrument.ts, runner.ts, benchmark.worker.ts
  algorithms/    search/, sort/, graph/, dp/, tsp/, sat/
  reductions/    coloring.ts, clique.ts, hamiltonian.ts, sudoku.ts, tseitin.ts
  views/         AlgorithmView, MemoryView, ScalingView, PredictWidget, Timeline
  modules/       search/, sorting/, ..., sat/, reductions/, growth-wall/
  store/         zustand stores, url-state.ts
tests/           mirrors src/algorithms and src/reductions
docs/PLAN.md
```

## Milestones

Eight milestones in four phases, about 13 weeks part-time; each ends with a gate you can demo. The order front-loads the shared engine so every later module is mostly content, not plumbing.

&#91;embedded content: roadmap · 4 phases, 8 milestones, 4 gates\]

1. **M1 — Engine and first vertical slice (search)**
   - Repo, CI, CLAUDE.md; TraceEvent schema, Instrument, trace/count runner, benchmark Web Worker.
   - The three views and timeline scrubber; a basic PredictWidget.
   - Linear vs binary search, “guess my number” game, growth-rate wall page.
   - Gate 1: binary search can be stepped, scrubbed and benchmarked, and the scaling plot fits log n.
2. **M2 — Sorting and recurrences**
   - Insertion, merge, quicksort (naive and random pivot); input presets and adversary editor.
   - Recursion-tree view with per-level cost sums; master theorem explainer.
   - Race mode.
3. **M3 — Time–space and graphs**
   - Fibonacci naive / memo / iterative with call-tree collapse.
   - Graph editor; BFS vs DFS memory comparison; Dijkstra array vs heap with density slider.
4. **M4 — The exponential wall**
   - Knapsack brute force vs DP table with “add a bit” control.
   - TSP: brute force, Held–Karp, nearest neighbour + 2-opt on a clickable map; optimality gap.
   - Verify-vs-solve page (Sudoku, subset sum).
   - Gate 2: all polynomial and exponential modules live with tests passing.
5. **M5 — SAT solvers**
   - CNF editor, DIMACS import/export, clause colouring.
   - Truth-table enumeration and DPLL with search tree, trail, heuristic picker, propagation toggle.
   - Random 3-SAT scaling and phase-transition experiments.
6. **M6 — Reductions to SAT**
   - Encoder/decoder pipeline with two-way highlighting.
   - 3-colouring, k-clique, Hamiltonian cycle, Sudoku, Tseitin; break-it mode; clause counter.
   - Gate 3: an instructor can run a full lecture on NP-completeness from the app.
7. **M7 — Engagement layer**
   - Predict-then-run scoring across all modules, mystery algorithm, challenge cards and badges (stored locally).
   - Guided tours per module.
8. **M8 — Classroom polish and release**
   - Shareable URLs and instructor presets, accessibility pass (keyboard, colour-blind palettes), performance budget.
   - Exercise sheet per module; pilot with a student group and fold in feedback.
   - Release: deployed site used in one course cohort.

## Working with Claude Code

Run one milestone per branch, start each in plan mode, and have Claude write the algorithm tests before the visual code. The CLAUDE.md below fixes the architecture so every session builds on the same contracts.

**Setup**

1. Create an empty repo `complexity-explorer`, open Claude Code in it.
2. Save this plan as `docs/PLAN.md` and the block below as `CLAUDE.md` in the repo root.
3. For each milestone: enter plan mode, paste the milestone’s deliverables, review the plan, then let it implement. Close the milestone only when its gate passes.

**Starter CLAUDE.md**

```markdown
# Complexity Explorer

Teaching app for algorithmic complexity. See docs/PLAN.md for milestones.

## Stack
Vite + React + TypeScript (strict), Zustand, D3/Observable Plot, Vitest, Playwright. Static site, no backend.

## Architecture rules
- src/algorithms/: pure TypeScript, no React, no DOM. Each algorithm is a generator
  that yields TraceEvents (see src/engine/events.ts).
- Every algorithm takes an Instrument object and reports ops through it
  (compare, read, write, swap, alloc, free, pushFrame, popFrame, clauseCheck, decide, propagate, conflict).
- Complexity is measured in operation counts and abstract memory cells, never wall-clock time
  (wall-clock is an optional secondary display only).
- The same generator runs in two modes: "trace" (events stored for animation) and
  "count" (events discarded, counters only) inside a Web Worker for scaling runs.
- Exponential algorithms must accept a budget (max ops / max ms) and stop cleanly.
- Each module lives in src/modules/<name>/ and composes the three shared views:
  AlgorithmView, MemoryView, ScalingView.

## Testing
- Every algorithm: correctness tests against a reference, and op-count tests on small fixed inputs.
- Every reduction: brute-force check on small instances that SAT-satisfiable == original-solvable,
  and that decoded solutions verify.

## Style
Small components, no global mutable state outside stores, accessibility labels on all controls.
```

**First prompt (Milestone 1)**

> Read CLAUDE.md and docs/PLAN.md. In plan mode, design the trace engine: the TraceEvent type, the Instrument interface, the trace/count runner, and the Web Worker benchmark that runs an algorithm for a list of n values and returns op and memory counts. Then implement linear and binary search on it with tests, and a minimal page that shows the three views for those two algorithms.

Good follow-up habits: ask Claude to add a new algorithm by pointing at an existing one as the pattern; ask for a Playwright test per module that steps through the animation; ask it to review op-count instrumentation against the textbook bound before each gate.

## Risks and stretch goals

The biggest risk is scope: eleven concepts is a lot, so the gates are designed so that the app is classroom-usable after Milestone 5 even if later ones slip.

| Risk | Mitigation |
| --- | --- |
| Exponential runs freeze the browser | All scaling runs in a Web Worker with op budgets; UI caps n per algorithm and extrapolates beyond it (dashed line) |
| Animations unusable at large n | Animate only small n (≤ \~30 elements); larger n switches to count mode and the scaling view |
| Visual overload | Progressive disclosure: start with one algorithm and one view, unlock comparisons after the first prediction |
| Wrong reductions or op counts | Brute-force cross-checks on small instances; op-count tests pinned to textbook formulas |
| Wall-clock noise confuses students | Primary metric is op counts; wall-clock shown only as an aside with a note on JIT and caching |
| Scope creep | Stretch items stay in a separate backlog until Milestone 8 ships |

**Stretch backlog**

- CDCL with implication graph and learned clauses; WalkSAT local search.
- Karatsuba vs schoolbook multiplication for divide-and-conquer.
- “Bring your own algorithm”: students write a small instrumented JS function in a sandboxed worker and get its scaling curve.
- Approximation algorithms (vertex cover 2-approx) to close the loop on coping with NP-hardness.
- LMS export of challenge results (e.g. LTI or a simple CSV download for the instructor).
