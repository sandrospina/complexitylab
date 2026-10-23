import type { Pseudocode } from './types';

export const TRUTH_TABLE: Pseudocode = {
  title: 'TRUTH-TABLE-SAT(φ)',
  idea: 'Try every assignment of true/false to the n variables, in binary order, and check the clauses until one fails. The first assignment that falsifies no clause is a model.',
  lines: [
    { code: 'for each assignment a of x₁..xₙ, in binary order', depth: 0, cost: 'c_1', times: '2^n', note: 'Row r of the truth table sets xᵢ to bit i − 1 of r. On an unsatisfiable formula every row is tried.' },
    { code: 'check the clauses in order; if a falsifies one, go on to the next assignment', depth: 1, unit: 'clause checks', cost: 'O(k) \\text{ per clause}', times: '\\le m \\cdot 2^n', note: 'A random 3-clause is falsified by 1 assignment in 8, so a row typically fails within a few clauses: about c · 2ⁿ checks, with c a small constant.' },
    { code: 'return a', depth: 1, cost: 'c_3', times: '0', note: 'It satisfies every clause.' },
    { code: 'return UNSATISFIABLE', depth: 0, cost: 'c_4', times: '1', note: '' },
  ],
  dominant: [2],
  bound: 'exp2',
  derivation: [
    {
      label: 'Unsatisfiable formula (the worst case)',
      tex: 'T(n, m) = \\Theta(2^n) \\cdot (\\text{clauses checked per row}) \\in [\\,2^n,\\; m \\cdot 2^n\\,]',
      text: 'All 2ⁿ rows are tried, each costing at least one clause check. The structure of φ only changes the constant per row: adding a variable always doubles the work. Space is just the current assignment, Θ(n).',
    },
  ],
  sources: ['sat/truth-table.ts'],
};

export const DPLL: Pseudocode = {
  title: 'DPLL(φ)',
  idea: 'Search by assigning one variable at a time, and after every decision assign everything that is forced: a unit clause (all literals false but one) forces its last literal. A falsified clause means a wrong choice: undo to the last decision and try its other value. With propagation (and pure literals) off, this is plain backtracking.',
  lines: [
    { code: 'PROPAGATE', depth: 0, cost: '', times: '1', note: 'Some literals may be forced before any decision.' },
    { code: 'while true', depth: 0, cost: 'c_2', note: 'One iteration per decision or flip.' },
    { code: 'if PROPAGATE found a falsified clause (a conflict)', depth: 1, cost: 'c_3', note: 'The current partial assignment cannot be extended to a model.' },
    { code: 'undo back to the latest decision whose other value is untried; if there is none, return UNSATISFIABLE', depth: 2, cost: 'O(n)', note: 'Chronological backtracking: the trail is popped back to that decision.' },
    { code: 'flip that decision; PROPAGATE', depth: 2, cost: 'c_5', note: 'Try the other value. A search-tree node: the second child.' },
    { code: 'else if every clause is satisfied then return the assignment', depth: 1, cost: 'c_6', note: 'Unassigned variables can take any value.' },
    { code: 'else ℓ ← CHOOSE-LITERAL; assign ℓ; PROPAGATE', depth: 1, cost: 'c_7', note: 'A new decision: a search-tree node, the first child.' },
    { code: 'repeat: visit every clause, until nothing changes', depth: 0, section: 'PROPAGATE', unit: 'clause visits', cost: 'O(k) \\text{ per clause}', note: 'A full scan of the clauses per round. (Real solvers watch two literals per clause instead of rescanning.)' },
    { code: 'a falsified clause: stop with a conflict; a unit clause: assign its last literal', depth: 1, unit: 'forced assignments', cost: 'c_9', note: 'Unit propagation: the inference that makes DPLL fast.' },
    { code: 'if nothing was forced and pure literals are on: assign every pure literal', depth: 1, unit: 'clause visits and assignments', cost: 'O(m)', note: 'A variable that appears with only one sign in the open clauses can be set to make them true.' },
    { code: 'first: the lowest unassigned variable. MOMS or Jeroslow–Wang: score the literals of the open clauses', depth: 0, section: 'CHOOSE-LITERAL', unit: 'clause visits', cost: 'O(m)', note: 'MOMS counts literals in the shortest open clauses; Jeroslow–Wang weighs every open clause by 2^(−its size). Both prefer literals that will soon force others.' },
  ],
  dominant: [8],
  bound: 'expc',
  derivation: [
    {
      label: 'Worst case: exponential',
      tex: '\\#\\text{search-tree nodes} = \\#(5) + \\#(7) \\le 2^{n+1} - 1, \\qquad \\text{each costs } O(nm)',
      text: 'A decision and its flip make a binary search tree over the n variables, so in the worst case DPLL still explores exponentially many nodes, and each costs a propagation pass. DPLL is complete: it always answers, and unsatisfiability is proved by exhausting the tree.',
    },
    {
      label: 'In practice: propagation prunes the tree',
      tex: '\\text{random 3-SAT at } m/n = 4.26: \\quad \\text{cost} \\approx c^n,\\; c \\approx 1.08 \\text{ (Jeroslow–Wang)} \\;\\text{ vs }\\; 2^n \\text{ (truth table)}',
      text: 'Each forced assignment removes a branch the search would otherwise explore, and a good heuristic forces more. Measured at the hardest ratio, DPLL’s cost grows by about 8 % per variable instead of 100 %: still exponential, but reaching 80 variables where the truth table stops at 20.',
    },
  ],
  sources: ['sat/dpll.ts'],
};
