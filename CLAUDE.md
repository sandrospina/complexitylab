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
- Recursion deeper than O(log n) is simulated with an explicit stack, each call marked by
  pushFrame/popFrame (see src/algorithms/sort/quick.ts): every event passes through each nested
  `yield*` generator, so real recursion of depth d makes each step cost O(d).
- Register every algorithm in src/modules/registry.ts with its expected class per input kind;
  tests/engine/benchmark.test.ts checks the measured class of every algorithm × input kind.
- Each module lives in src/modules/<name>/ and composes the three shared views:
  AlgorithmView, MemoryView, ScalingView.

## Testing
- Every algorithm: correctness tests against a reference, and op-count tests on small fixed inputs.
- Every reduction: brute-force check on small instances that SAT-satisfiable == original-solvable,
  and that decoded solutions verify.

## Style
Small components, no global mutable state outside stores, accessibility labels on all controls.
