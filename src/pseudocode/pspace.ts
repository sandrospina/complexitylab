import type { Pseudocode } from './types';

export const QBF_EVAL: Pseudocode = {
  title: 'QBF-EVAL(i)',
  idea: 'Evaluate Q₁x₁ … Qₙxₙ φ as a game: the ∃ player wants it true, the ∀ player false. QBF-EVAL(i) is the value of the game once x₁..xᵢ₋₁ are set. Try xᵢ = false, then xᵢ = true, and combine with OR at ∃ and AND at ∀. The answer is QBF-EVAL(1).',
  lines: [
    { code: 'if i > n', depth: 0, cost: 'c_1', times: '2^{n+1} - 1', note: 'Every node of the game tree: 2ⁿ − 1 internal nodes and 2ⁿ leaves when nothing short-circuits.' },
    { code: 'return whether x satisfies every clause of φ', depth: 1, unit: 'clause checks', cost: 'O(k) \\text{ per clause}', times: '\\ge 2^n', note: 'A leaf: all variables are set. Stop at the first falsified clause.' },
    { code: 'xᵢ ← false; r ← QBF-EVAL(i + 1)', depth: 0, cost: 'c_3 + T(i+1)', times: '2^n - 1', note: 'The first child. Its frame is popped before the second child is pushed, so the two share the same space.' },
    { code: 'if (Qᵢ = ∃ and r) or (Qᵢ = ∀ and not r) then return r', depth: 0, cost: 'c_4', times: '2^n - 1', note: 'Short-circuit: ∃ already has a winning move, or ∀ already has a refutation.' },
    { code: 'xᵢ ← true; return QBF-EVAL(i + 1)', depth: 0, cost: 'c_5 + T(i+1)', times: '\\le 2^n - 1', note: 'Otherwise the second child decides.' },
  ],
  dominant: [2],
  bound: 'exp2',
  derivation: [
    {
      label: 'Time, worst case (nothing short-circuits)',
      tex: 'T(i) = 2\\,T(i+1) + \\Theta(1), \\quad T(n+1) = \\Theta(m) \\;\\Rightarrow\\; T(1) = \\Theta(2^n \\cdot m)',
      text: 'The all-∃ unsatisfiable kind is SAT answered no: every leaf is tried, as in the truth table. Short-circuits prune whole subtrees, which is why the alternating kind fits a base below 2, but in the worst case nothing does.',
    },
    {
      label: 'Space: a path, not the tree',
      tex: 'S(i) = S(i+1) + \\Theta(1), \\quad S(n+1) = \\Theta(1) \\;\\Rightarrow\\; S(1) = \\Theta(n) \\text{ frames} + n \\text{ cells}',
      text: 'Only the current root-to-leaf path is ever on the stack. The space of the false subtree is freed and reused for the true one, so 2ⁿ leaves cost n frames. Time cannot be reused like this, which is the whole difference between PSPACE and EXPTIME: TQBF is in PSPACE, and every problem in PSPACE reduces to it.',
    },
  ],
  sources: ['qbf/recursive.ts'],
};

export const QBF_TABLE: Pseudocode = {
  title: 'QBF-TABLE(Q, φ)',
  idea: 'The same game, bottom-up. Fill a table with φ’s value at every one of the 2ⁿ leaves, then fold it one quantifier at a time, innermost first: each pair of neighbours becomes one entry, their OR at ∃ and their AND at ∀.',
  lines: [
    { code: 'for r ← 0 to 2ⁿ − 1', depth: 0, cost: 'c_1', times: '2^n', note: 'Leaf r sets x₁ to the top bit of r and xₙ to the bottom one.' },
    { code: 'T[r] ← whether the bits of r satisfy every clause of φ', depth: 1, unit: 'clause checks', cost: 'O(k) \\text{ per clause}', times: '\\ge 2^n', note: 'All 2ⁿ leaves are stored at once.' },
    { code: 'for i ← n downto 1', depth: 0, cost: 'c_3', times: 'n', note: 'Innermost quantifier first.' },
    { code: 'for r ← 0 to 2^{i−1} − 1', depth: 1, cost: 'c_4', times: '2^n - 1', note: '2ⁿ⁻¹ + 2ⁿ⁻² + … + 1 pairs in all.' },
    { code: 'T[r] ← T[2r] ∨ T[2r + 1] if Qᵢ = ∃, else T[2r] ∧ T[2r + 1]', depth: 2, cost: 'c_5', times: '2^n - 1', note: 'In place: entry r is written after entries 2r and 2r + 1 are read.' },
    { code: 'return T[0]', depth: 0, cost: 'c_6', times: '1', note: '' },
  ],
  dominant: [2, 5],
  bound: 'exp2',
  derivation: [
    {
      label: 'Time: always the whole tree',
      tex: 'T = \\Theta(2^n \\cdot m) + (c_4 + c_5)(2^n - 1) + c_3 n = \\Theta(2^n \\cdot m)',
      text: 'The same 2ⁿ leaves as the recursion, and no short-circuit is possible: every leaf is computed before any quantifier is applied.',
    },
    {
      label: 'Space: every leaf at once',
      tex: 'S = 2^n \\text{ cells} \\quad \\text{vs} \\quad \\Theta(n) \\text{ for QBF-EVAL}',
      text: 'An exponential table where the recursion needed a linear stack. Storing everything is the natural way to compute, and for this problem it is exponentially wasteful.',
    },
  ],
  sources: ['qbf/table.ts'],
};

export const REACH_BFS: Pseudocode = {
  title: 'REACH-BFS(G, s, t)',
  idea: 'Breadth-first search from s, answering yes as soon as t comes off the queue. Fast, but it remembers every vertex it has seen.',
  lines: [
    { code: 'visited[1..n] ← false; visited[s] ← true; Q ← ⟨s⟩', depth: 0, cost: 'c_1', times: '1', note: 'n flags and a queue of up to n vertices: Θ(n) cells.' },
    { code: 'while Q ≠ ∅', depth: 0, cost: 'c_2', note: 'At most n iterations: each vertex is queued once.' },
    { code: 'u ← DEQUEUE(Q); if u = t then return true', depth: 1, cost: 'c_3', note: '' },
    { code: 'for each v in Adj[u]', depth: 1, cost: 'c_4', note: 'Each edge once, over the whole run.' },
    { code: 'if not visited[v]', depth: 2, cost: 'c_5', note: 'The counted check.' },
    { code: 'visited[v] ← true; ENQUEUE(Q, v)', depth: 3, cost: 'c_6', note: '' },
    { code: 'return false', depth: 0, cost: 'c_7', note: 'The queue ran dry without meeting t.' },
  ],
  dominant: [3, 5],
  bound: 'n',
  derivation: [
    {
      label: 'Time and space',
      tex: 'T = O(n + E), \\qquad S = \\Theta(n) \\text{ cells}',
      text: 'Linear time on the sparse graphs here (quadratic on a dense one), but n flags of memory however the search goes. Reachability is in NL: a nondeterministic machine only needs the current vertex and a step counter, O(log n) bits, guessing the path one edge at a time. Savitch asks how close a deterministic machine can get to that.',
    },
  ],
  sources: ['reach/bfs.ts'],
};

export const SAVITCH: Pseudocode = {
  title: 'REACH(u, v, k)',
  idea: 'Is there a path from u to v of length at most 2ᵏ? If so, it has a midpoint w with both halves at most 2ᵏ⁻¹ long. Try every w, and solve each half the same way. The answer is REACH(s, t, ⌈log₂ n⌉), since a path need never be longer than n − 1.',
  lines: [
    { code: 'if k = 0', depth: 0, cost: 'c_1', times: '\\le \\sum_{j=0}^{k} (2n)^j', note: 'Once per call. Each call makes at most 2n calls one level down.' },
    { code: 'return u = v or (u, v) ∈ E', depth: 1, cost: 'c_2', note: 'A path of length 0 or 1.' },
    { code: 'for each vertex w', depth: 0, cost: 'c_3', note: 'Every vertex is a candidate midpoint, including u and v.' },
    { code: 'if REACH(u, w, k − 1)', depth: 1, cost: 'T(k-1)', note: 'The first half. Its frame is popped before the second half reuses the space.' },
    { code: 'and REACH(w, v, k − 1) then return true', depth: 2, cost: 'T(k-1)', note: 'Only asked if the first half exists.' },
    { code: 'return false', depth: 0, cost: 'c_6', note: 'No midpoint works.' },
  ],
  dominant: [1],
  bound: 'quasi',
  derivation: [
    {
      label: 'Space: ⌈log₂ n⌉ frames of O(log n) bits',
      tex: 'S(k) = S(k-1) + O(\\log n) \\;\\Rightarrow\\; S = O(\\log n \\cdot \\log n) = O(\\log^2 n) \\text{ bits}',
      text: 'Each frame stores u, v, w and k, each a number below n: O(log n) bits. The recursion is only ⌈log₂ n⌉ deep, because k halves the path length at every level. Compare BFS’s n flags.',
    },
    {
      label: 'Time: the price is quasi-polynomial',
      tex: 'T(k) \\le 2n\\,T(k-1) + O(n) \\;\\Rightarrow\\; T = O\\big((2n)^{\\lceil \\log_2 n \\rceil}\\big) = n^{O(\\log n)}',
      text: 'Nothing is remembered between calls, so the same half-paths are solved again and again. That is slower than any polynomial and faster than any cⁿ: the n^(log n) the scaling plot fits.',
    },
    {
      label: 'Savitch’s theorem: NSPACE(s) ⊆ SPACE(s²)',
      tex: '|\\text{configurations}| = 2^{O(s)} \\;\\Rightarrow\\; k = O(s), \\; S = O(s) \\cdot O(s) = O(s^2)',
      text: 'Run REACH on the configuration graph of a nondeterministic machine using s cells: a vertex is a configuration (state, head positions, tape contents), an edge is one step, and the machine accepts when an accepting configuration is reachable from the start. The graph is never stored: its edges are computed on demand. So nondeterminism costs at most a square in space, and NPSPACE = PSPACE. Nobody knows whether the same holds for time (P vs NP).',
    },
  ],
  sources: ['reach/savitch.ts'],
};

export const GEOGRAPHY_WIN: Pseudocode = {
  title: 'WIN(v)',
  idea: 'Does the player about to move from v win? Exactly when some move leads to a position the opponent loses. Try each unvisited successor w, mark it, and ask whether the opponent wins from there. The answer for the first player is WIN(start), with start already visited.',
  lines: [
    { code: 'for each w in Adj[v]', depth: 0, cost: 'c_1', note: 'Every possible move from v.' },
    { code: 'if not visited[w]', depth: 1, cost: 'c_2', note: 'The token may not return to a vertex it has visited.' },
    { code: 'visited[w] ← true; r ← WIN(w); visited[w] ← false', depth: 2, cost: 'c_3 + T(w)', note: 'Move, let the opponent play the rest of the game from w, and take the move back: one frame per move on the current path.' },
    { code: 'if not r then return true', depth: 2, cost: 'c_4', note: 'The opponent loses from w, so moving to w wins.' },
    { code: 'return false', depth: 0, cost: 'c_5', note: 'Every move loses (or there is none).' },
  ],
  dominant: [2],
  bound: 'exp2',
  derivation: [
    {
      label: 'Time: one branch per move, along every path',
      tex: 'T \\le \\#\\{\\text{simple paths from start}\\} \\cdot \\max \\deg = 2^{O(n)} \\text{ in the worst case}',
      text: 'The search tries every sequence of moves the game allows. On a board built from a formula, every diamond doubles the number of games, so with nothing to short-circuit the board from an unsatisfiable all-∃ formula costs Θ(2ⁿ), as the scaling plot measures.',
    },
    {
      label: 'Space: one path',
      tex: 'S = n \\text{ flags} + (\\text{longest game}) \\text{ frames} \\le 2n',
      text: 'A game visits each vertex at most once, so it lasts at most n moves, and only the current game is on the stack. Geography is in PSPACE, and the reduction from TQBF makes it PSPACE-complete.',
    },
    {
      label: 'TQBF ≤ₚ Geography',
      tex: '|V| = 4d + 1 + m, \\quad d \\le 2n + 1 \\text{ diamonds (one per variable, plus padding)}, \\; m \\text{ clauses}',
      text: 'A board linear in the size of the formula, built in polynomial time, whose first player wins exactly when the formula is true. A fast algorithm for Geography would therefore give a fast algorithm for every problem in PSPACE.',
    },
  ],
  sources: ['geography/minimax.ts'],
};
