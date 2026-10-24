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
