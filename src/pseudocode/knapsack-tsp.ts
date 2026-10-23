import type { Pseudocode } from './types';

export const KNAPSACK_BRUTE: Pseudocode = {
  title: 'KNAPSACK-BRUTE(w, v, W)',
  idea: 'Try every subset of the n items and keep the most valuable one that fits. Visiting the subsets in Gray-code order means each step adds or removes exactly one item, so each subset costs constant work.',
  lines: [
    { code: 'chosen ← ∅; weight ← 0; value ← 0; best ← 0', depth: 0, cost: 'c_1', times: '1', note: '2n cells: the current subset and the best one.' },
    { code: 'for k ← 1 to 2ⁿ − 1', depth: 0, cost: 'c_2', times: '2^n', note: 'One iteration per non-empty subset (the empty one is the starting point), plus the final test.' },
    { code: 'i ← the position of the lowest set bit of k', depth: 1, cost: 'c_3', times: '2^n - 1', note: 'Consecutive Gray codes differ in exactly this bit.' },
    { code: 'flip item i in or out of chosen; update weight and value', depth: 1, cost: 'c_4', times: '2^n - 1', note: 'Θ(1): one item changes, not the whole subset.' },
    { code: 'if weight ≤ W and value > best', depth: 1, cost: 'c_5', times: '2^n - 1', note: 'Does this subset fit, and beat the best so far? (Two counted compares.)' },
    { code: 'best ← value; remember chosen', depth: 2, cost: 'c_6', times: '\\le 2^n - 1', note: 'A new best subset.' },
    { code: 'return best and its items', depth: 0, cost: 'c_7', times: '1', note: '' },
  ],
  dominant: [3, 4, 5],
  bound: 'exp2',
  derivation: [
    {
      label: 'Any instance',
      tex: 'T(n) = (c_2 + c_3 + c_4 + c_5)\\,(2^n - 1) + O(2^n) = \\Theta(2^n)',
      text: 'Every one of the 2ⁿ subsets is tried, at constant cost each, whatever W is. On the "bits of W" axis, with n fixed at 10, the cost does not move at all: brute force is exponential in the items, not in W.',
    },
  ],
  sources: ['knapsack/brute.ts'],
};

export const KNAPSACK_DP: Pseudocode = {
  title: 'KNAPSACK-DP(w, v, W)',
  idea: 'B[i, c] is the best value using the first i items within capacity c. Item i is either skipped (B[i − 1, c]) or taken, if it fits (B[i − 1, c − wᵢ] + vᵢ): fill the table row by row.',
  lines: [
    { code: 'B[0..n, 0..W] ← 0', depth: 0, cost: 'c_1', times: '1', note: '(n + 1)(W + 1) cells: one per item count and capacity.' },
    { code: 'for i ← 1 to n', depth: 0, cost: 'c_2', times: 'n + 1', note: 'Each item.' },
    { code: 'for c ← 0 to W', depth: 1, cost: 'c_3', times: 'n(W + 2)', note: 'Each capacity: W + 1 values, so the work grows with the value of W.' },
    { code: 'skip ← B[i − 1, c]', depth: 2, cost: 'c_4', times: 'n(W + 1)', note: 'Best without item i.' },
    { code: 'take ← B[i − 1, c − wᵢ] + vᵢ if wᵢ ≤ c, else −∞', depth: 2, cost: 'c_5', times: 'n(W + 1)', note: 'Best with item i, if it fits.' },
    { code: 'B[i, c] ← max(skip, take)', depth: 2, cost: 'c_6', times: 'n(W + 1)', note: 'The counted compare.' },
    { code: 'walk back from B[n, W]: item i was taken where B[i, c] ≠ B[i − 1, c]', depth: 0, cost: 'c_7', times: 'n', note: 'Recovers the chosen items; it needs the whole table.' },
    { code: 'return B[n, W] and the items', depth: 0, cost: 'c_8', times: '1', note: '' },
  ],
  dominant: [4, 5, 6],
  bound: 'n2',
  derivation: [
    {
      label: 'Any instance: pseudo-polynomial',
      tex: 'T(n, W) = (c_4 + c_5 + c_6)\\,n(W + 1) + O(n + W) = \\Theta(nW)',
      text: 'One constant-work cell per (item, capacity) pair. With W = 8n (the "items" axis) that is Θ(n²) and looks polynomial; the bound class shown here.',
    },
    {
      label: 'In the size of the input',
      tex: 'W \\text{ takes } b = \\lceil \\log_2 (W + 1) \\rceil \\text{ bits} \\;\\Rightarrow\\; T = \\Theta(n \\cdot 2^b)',
      text: 'An input of n items and a b-bit capacity has length about n + b, but the table has 2ᵇ columns: exponential in the length of W. "Add a bit" doubles W and the table. That is what pseudo-polynomial means.',
    },
  ],
  sources: ['knapsack/dp.ts'],
};

export const TSP_BRUTE: Pseudocode = {
  title: 'TSP-BRUTE(P)',
  idea: 'Fix city 1 as the start and try every order of the other n − 1 cities, keeping the shortest tour. Heap’s algorithm generates each new order with a single swap.',
  lines: [
    { code: 'best ← ∞', depth: 0, cost: 'c_1', times: '1', note: '' },
    { code: 'for each ordering π of cities 2..n (Heap’s algorithm: one swap per new ordering)', depth: 0, cost: 'c_2', times: '(n-1)!', note: 'Fixing city 1 avoids counting the same tour once per starting point.' },
    { code: 'cost ← the sum of the n edge lengths of the tour 1, π, 1', depth: 1, unit: 'edge lengths', cost: 'c_3 \\text{ per edge}', times: 'n \\cdot (n-1)! = n!', note: 'Each tour has n edges, all summed afresh.' },
    { code: 'if cost < best then best ← cost; remember π', depth: 1, cost: 'c_4', times: '(n-1)!', note: 'The counted compare.' },
    { code: 'return best and its tour', depth: 0, cost: 'c_5', times: '1', note: '' },
  ],
  dominant: [3],
  bound: 'fact',
  derivation: [
    {
      label: 'Any n cities',
      tex: 'T(n) = c_3\\,n! + (c_2 + c_4)(n-1)! + \\Theta(1) = \\Theta(n!) ,\\qquad n! \\approx \\sqrt{2\\pi n}\\left(\\tfrac{n}{e}\\right)^{n}',
      text: 'There are (n − 1)! orderings and each costs n to measure. Factorial growth outpaces any cⁿ: 10 cities need 3.6 million edge lengths, 20 cities about 2.4 · 10¹⁸.',
    },
  ],
  sources: ['tsp/brute.ts'],
};

export const HELD_KARP: Pseudocode = {
  title: 'HELD-KARP(P)',
  idea: 'Dynamic programming over subsets. B[S, j] is the length of the shortest path that starts at city 1, visits exactly the cities in S, and ends at j ∈ S. The best tour closes the best path through all cities.',
  lines: [
    { code: 'for j ← 2 to n: B[{j}, j] ← d(1, j)', depth: 0, cost: 'c_1', times: 'n - 1', note: 'Paths through one city.' },
    { code: 'for each nonempty S ⊆ {2..n}, in order of increasing bitmask', depth: 0, cost: 'c_2', times: '2^{n-1} - 1', note: 'A subset’s bitmask is larger than its subsets’, so they are always done first.' },
    { code: 'for each j ∈ S', depth: 1, cost: 'c_3', times: '(n-1)\\,2^{n-2}', note: 'Each possible last city of a path through S.' },
    { code: 'for each k ∉ S: B[S ∪ {k}, k] ← min(B[S ∪ {k}, k], B[S, j] + d(j, k))', depth: 2, cost: 'c_4', times: '(n-1)(n-2)\\,2^{n-3}', note: 'Extend the path by one city outside S: the counted compare.' },
    { code: 'cost ← min over j of B[{2..n}, j] + d(j, 1)', depth: 0, cost: 'c_5', times: 'n - 1', note: 'Close the tour back to city 1.' },
    { code: 'follow the stored predecessors back from the best j to read the tour', depth: 0, cost: 'O(n)', times: '1', note: '' },
  ],
  dominant: [4],
  bound: 'n2exp2',
  derivation: [
    {
      label: 'Any n cities',
      tex: '\\sum_{S} |S|\\,(m - |S|) = \\sum_{s} \\tbinom{m}{s} s (m-s) = m(m-1)\\,2^{m-2}, \\quad m = n - 1 \\;\\Rightarrow\\; T(n) = \\Theta(n^2 2^n)',
      text: 'Line 4 runs once per subset, end city in it and city outside it. Summing over subsets by size gives (n − 1)(n − 2)2ⁿ⁻³. Space: n · 2ⁿ⁻¹ table cells. Still exponential, but n²2ⁿ against n!: 16 cities in about 10⁷ steps, where brute force stops near 10.',
    },
  ],
  sources: ['tsp/held-karp.ts'],
};

export const TSP_HEURISTIC: Pseudocode = {
  title: 'TSP-NEAREST-NEIGHBOUR-2-OPT(P)',
  idea: 'Build a tour greedily, always going to the nearest unvisited city; then improve it with 2-opt moves: when two edges cross (or are simply worse than their swap), reverse the stretch between them. Fast, but with no guarantee of being optimal.',
  lines: [
    { code: 'tour ← ⟨1⟩; mark city 1 visited', depth: 0, cost: 'c_1', times: '1', note: '' },
    { code: 'for pos ← 2 to n', depth: 0, cost: 'c_2', times: 'n', note: '' },
    { code: 'tour[pos] ← the nearest unvisited city to tour[pos − 1]', depth: 1, unit: 'compares', cost: 'c_3 \\text{ per candidate}', times: '\\tfrac{n(n-1)}{2}', note: 'Scan all unvisited cities: n − 1, then n − 2, … candidates.' },
    { code: 'repeat', depth: 0, cost: 'c_4', times: 'p', note: 'One 2-opt pass; p passes in all.' },
    { code: 'for each pair of non-adjacent tour edges (a, b) and (c, d)', depth: 1, cost: 'c_5', times: 'p \\cdot \\tfrac{n(n-3)}{2}', note: 'The counted compare: is d(a, c) + d(b, d) < d(a, b) + d(c, d)?' },
    { code: 'if swapping them is shorter, reverse the stretch of the tour from b to c', depth: 2, unit: 'swaps', cost: 'O(n)', note: 'A reversal replaces the two edges by (a, c) and (b, d).' },
    { code: 'until a whole pass improves nothing', depth: 0, cost: 'c_7', times: 'p', note: 'A local optimum: no single 2-opt move helps.' },
    { code: 'return tour', depth: 0, cost: 'c_8', times: '1', note: '' },
  ],
  dominant: [3, 5],
  bound: 'n2logn',
  derivation: [
    {
      label: 'Nearest neighbour, then p passes of 2-opt',
      tex: 'T(n) = \\Theta(n^2) + p \\cdot \\Theta(n^2) \\quad (\\text{plus the reversals})',
      text: 'Each pass looks at all n(n − 3)/2 pairs of edges. How many passes are needed depends on the cities: there is no good worst-case bound, so this one is measured, not proved. On random cities p grows slowly, roughly like log n, and the scaling plot fits Θ(n² log n).',
    },
    {
      label: 'What it buys',
      tex: '\\text{cost(heuristic)} \\ge \\text{cost(optimal)}',
      text: 'Polynomial time instead of exponential, and on random cities usually within a few percent of the optimum (the gap column on this page). But nothing promises that: for some inputs it can be far off.',
    },
  ],
  sources: ['tsp/heuristic.ts'],
};
