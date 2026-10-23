import type { Pseudocode } from './types';

export const FIBONACCI: Pseudocode = {
  title: 'FIB(n), and MEMO-FIB(n)',
  idea: 'fib(k) = fib(k − 1) + fib(k − 2). Written as it stands, the recursion recomputes the same values over and over. The memoised version stores each value the first time and looks it up afterwards: lines 1, 3 and 6 belong to it only.',
  lines: [
    { code: 'memo[0..n] ← NIL', depth: 0, section: 'MEMO-FIB(n) (memoised version only), then FIB(k) with k = n', cost: 'c_1', times: '0', note: 'One table cell per value 0..n: the space memoisation pays.' },
    { code: 'if k < 2 then return k', depth: 0, section: 'FIB(k)', cost: 'c_2', times: '2F_{n+1} - 1', note: 'The base cases fib(0) = 0, fib(1) = 1. This test runs once per call, so its count is the number of calls.' },
    { code: 'if memo[k] ≠ NIL then return memo[k]', depth: 0, cost: 'c_3', times: '0', note: 'Memoised version only: a value already computed is returned at once (a "memo hit").' },
    { code: 'a ← FIB(k − 1)', depth: 0, cost: 'c_4 + T(k-1)', times: 'F_{n+1} - 1', note: 'First recursive call.' },
    { code: 'b ← FIB(k − 2)', depth: 0, cost: 'c_5 + T(k-2)', times: 'F_{n+1} - 1', note: 'Second recursive call: in the naive version it repeats work the first call already did.' },
    { code: 'memo[k] ← a + b', depth: 0, cost: 'c_6', times: '0', note: 'Memoised version only: remember the value.' },
    { code: 'return a + b', depth: 0, cost: 'c_7', times: 'F_{n+1} - 1', note: 'Combine.' },
  ],
  dominant: [2],
  bound: 'expPhi',
  derivation: [
    {
      label: 'Naive: the calls themselves grow like Fibonacci numbers',
      tex: 'C(k) = 1 + C(k-1) + C(k-2),\\; C(0) = C(1) = 1 \\;\\Rightarrow\\; C(n) = 2F_{n+1} - 1 = \\Theta(\\varphi^n),\\quad \\varphi = \\tfrac{1+\\sqrt5}{2} \\approx 1.618',
      text: 'The number of calls C satisfies the Fibonacci recurrence itself (plus one for the call), so it is 2F(n+1) − 1, and F(n) ≈ φⁿ/√5. The times column shows the naive version. Each call does a constant amount of work, so time is Θ(φⁿ); it is often quoted as O(2ⁿ), a valid upper bound but not tight. The stack is n frames deep: Θ(n) space.',
    },
    {
      label: 'Memoised: each value is computed once',
      tex: '\\#(\\text{line }2) = 2n - 1,\\quad \\#(\\text{line }7) = n - 1 \\;\\Rightarrow\\; T(n) = \\Theta(n),\\quad S(n) = \\underbrace{n + 1}_{\\text{memo}} + \\underbrace{n}_{\\text{stack}} = \\Theta(n)',
      text: 'fib(k) for k = 2..n is computed once each (lines 4–7, n − 1 times); every other call is a base case or a memo hit that returns on line 2 or 3. Spending n + 1 cells of memory turns exponential time into linear time.',
    },
  ],
  sources: ['fib/recursive.ts'],
};

export const FIBONACCI_ITERATIVE: Pseudocode = {
  title: 'FIB-ITERATIVE(n)',
  idea: 'Build the values bottom-up, keeping only the last two: no recursion, no table.',
  lines: [
    { code: 'a ← 0; b ← 1', depth: 0, cost: 'c_1', times: '1', note: 'a = fib(k − 2) and b = fib(k − 1): two cells, whatever n is.' },
    { code: 'for k ← 2 to n', depth: 0, cost: 'c_2', times: 'n', note: 'n − 1 iterations, plus the test that ends the loop.' },
    { code: '(a, b) ← (b, a + b)', depth: 1, cost: 'c_3', times: 'n - 1', note: 'Slide the window one step: now b = fib(k).' },
    { code: 'return b (or n, if n < 2)', depth: 0, cost: 'c_4', times: '1', note: 'fib(n).' },
  ],
  dominant: [3],
  bound: 'n',
  derivation: [
    {
      label: 'Any n ≥ 2',
      tex: 'T(n) = c_1 + c_2\\,n + c_3\\,(n-1) + c_4 = \\Theta(n),\\qquad S(n) = 2 \\text{ cells} = \\Theta(1)',
      text: 'One pass with constant work per step. Compared with the memoised recursion, the same time in constant space: only the last two values are ever needed.',
    },
  ],
  sources: ['fib/iterative.ts'],
};

export const CYCLE_HASH: Pseudocode = {
  title: 'CYCLE-HASH(f, x₀)',
  idea: 'Walk x₀, f(x₀), f(f(x₀)), … remembering each value and the step it appeared at. The first value seen twice is where the loop starts.',
  lines: [
    { code: 'seen ← empty map; x ← x₀; i ← 0', depth: 0, cost: 'c_1', times: '1', note: 'seen maps a value to the step it was first visited.' },
    { code: 'while x ∉ seen', depth: 0, cost: 'c_2', times: 'n + 1', note: 'A hash lookup, Θ(1) on average: the counted comparison. n = μ + λ values are new; the next one is the repeat.' },
    { code: 'seen[x] ← i', depth: 1, cost: 'c_3', times: 'n', note: 'Remember x: one more memory cell.' },
    { code: 'x ← f(x); i ← i + 1', depth: 1, cost: 'c_4', times: 'n', note: 'Step along the sequence.' },
    { code: 'return μ = seen[x], λ = i − seen[x]', depth: 0, cost: 'c_5', times: '1', note: 'x first appeared at step μ (the tail length) and again at step i, one loop later.' },
  ],
  dominant: [2, 3, 4],
  bound: 'n',
  derivation: [
    {
      label: 'Any sequence with tail μ and loop λ (n = μ + λ)',
      tex: 'T(n) = c_1 + c_2(n+1) + (c_3 + c_4)\\,n + c_5 = \\Theta(n),\\qquad S(n) = n \\text{ cells} = \\Theta(n)',
      text: 'Every value before the repeat is visited and stored exactly once. One pass, but one cell per value: the memory grows with the sequence.',
    },
  ],
  sources: ['cycle/hash.ts'],
};

export const FLOYD: Pseudocode = {
  title: 'FLOYD-CYCLE(f, x₀)',
  idea: 'Two pointers, the tortoise t moving one step at a time and the hare h moving two. Once both are in the loop the hare gains one step per round, so they must meet. Then the entrance and the loop length can be read off without remembering anything.',
  lines: [
    { code: 't ← x₀; h ← x₀', depth: 0, cost: 'c_1', times: '1', note: 'Two pointers: and, with μ and λ, all the memory this needs.' },
    { code: 'repeat t ← f(t); h ← f(f(h)) until t = h', depth: 0, cost: 'c_2', times: 'k \\le n', note: 'k rounds, where k is the first multiple of λ that is ≥ μ (and ≥ 1): inside the loop the gap closes by one per round.' },
    { code: 'μ ← 0; t ← x₀', depth: 0, cost: 'c_3', times: '1', note: 'Tortoise back to the start; the hare stays where they met.' },
    { code: 'while t ≠ h', depth: 0, cost: 'c_4', times: '\\mu + 1', note: 'The meeting point is a multiple of λ steps from x₀, so walking both one step at a time, they meet exactly at the loop entrance, after μ steps.' },
    { code: 't ← f(t); h ← f(h); μ ← μ + 1', depth: 1, cost: 'c_5', times: '\\mu', note: 'Both at the same speed now.' },
    { code: 'λ ← 0', depth: 0, cost: 'c_6', times: '1', note: '' },
    { code: 'repeat h ← f(h); λ ← λ + 1 until h = t', depth: 0, cost: 'c_7', times: '\\lambda', note: 'Once round the loop, counting.' },
    { code: 'return μ, λ', depth: 0, cost: 'c_8', times: '1', note: 'Tail length and loop length.' },
  ],
  dominant: [2, 4, 7],
  bound: 'n',
  derivation: [
    {
      label: 'Any sequence with tail μ and loop λ (n = μ + λ)',
      tex: 'k = \\min\\{\\, j \\ge \\max(1, \\mu) : \\lambda \\mid j \\,\\} < \\mu + \\lambda \\;\\Rightarrow\\; T(n) = c_2 k + c_4(\\mu+1) + c_5 \\mu + c_7 \\lambda + \\Theta(1) = \\Theta(n),\\qquad S(n) = 4 \\text{ cells} = \\Theta(1)',
      text: 'Each phase walks at most the whole sequence a constant number of times, so time stays linear (about 3 to 7 steps per value instead of the hash set’s 3), but memory is four cells however long the sequence is.',
    },
  ],
  sources: ['cycle/floyd.ts'],
};

const LCS_IDEA =
  'L[i, j] is the length of the longest common subsequence of a[1..i] and b[1..j]. If the last letters match, they extend the LCS of the shorter prefixes; if not, the answer drops one of them.';

export const LCS_TABLE: Pseudocode = {
  title: 'LCS-TABLE(a, b)',
  idea: `${LCS_IDEA} Keeping the whole table lets a walk back from the corner spell the subsequence out.`,
  lines: [
    { code: 'L[0..n, 0..m] ← 0', depth: 0, cost: 'c_1', times: '1', note: '(n + 1)(m + 1) cells. Row 0 and column 0 stay 0: an empty prefix has an empty LCS.' },
    { code: 'for i ← 1 to n', depth: 0, cost: 'c_2', times: 'n + 1', note: 'Each letter of a.' },
    { code: 'for j ← 1 to m', depth: 1, cost: 'c_3', times: 'n(m + 1)', note: 'Each letter of b.' },
    { code: 'if a[i] = b[j]', depth: 2, cost: 'c_4', times: 'nm', note: 'One comparison per cell: the counted operation.' },
    { code: 'L[i, j] ← L[i − 1, j − 1] + 1', depth: 3, cost: 'c_5', note: 'A match extends the diagonal neighbour.' },
    { code: 'else L[i, j] ← max(L[i − 1, j], L[i, j − 1])', depth: 2, cost: 'c_6', note: 'No match: the better of dropping a[i] or b[j]. Lines 5 and 6 together run nm times.' },
    { code: 'walk back from L[n, m]: diagonal on a match, else towards the larger neighbour', depth: 0, unit: 'steps', cost: 'c_7', times: '\\le n + m', note: 'Each step moves up, left or both, so at most n + m steps. It needs every cell: this is why the table is kept.' },
    { code: 'return L[n, m] and the letters met on diagonal steps', depth: 0, cost: 'c_8', times: '1', note: 'The length and the subsequence itself.' },
  ],
  dominant: [4],
  bound: 'n2',
  derivation: [
    {
      label: 'Strings of length n and m',
      tex: 'T(n, m) = c_4\\,nm + (c_5 \\text{ or } c_6)\\,nm + O(n + m) = \\Theta(nm),\\qquad S(n, m) = (n+1)(m+1) = \\Theta(nm)',
      text: 'Every cell is filled once with constant work. With m = n, as on this page, that is Θ(n²) time and Θ(n²) cells.',
    },
  ],
  sources: ['lcs/table.ts'],
};

export const LCS_ROWS: Pseudocode = {
  title: 'LCS-TWO-ROWS(a, b)',
  idea: `${LCS_IDEA} Row i only reads row i − 1, so two rows are enough for the length; but the walk back needs rows that have been overwritten, so the subsequence is lost.`,
  lines: [
    { code: 'prev[0..m] ← 0; cur[0..m] ← 0', depth: 0, cost: 'c_1', times: '1', note: '2(m + 1) cells instead of (n + 1)(m + 1).' },
    { code: 'for i ← 1 to n', depth: 0, cost: 'c_2', times: 'n + 1', note: '' },
    { code: 'for j ← 1 to m', depth: 1, cost: 'c_3', times: 'n(m + 1)', note: '' },
    { code: 'if a[i] = b[j]', depth: 2, cost: 'c_4', times: 'nm', note: 'Exactly the comparisons of the full table.' },
    { code: 'cur[j] ← prev[j − 1] + 1', depth: 3, cost: 'c_5', note: '' },
    { code: 'else cur[j] ← max(prev[j], cur[j − 1])', depth: 2, cost: 'c_6', note: 'Lines 5 and 6 together run nm times.' },
    { code: 'swap prev and cur', depth: 1, cost: 'c_7', times: 'n', note: 'The row just filled becomes the previous row; the old one is reused.' },
    { code: 'return prev[m]', depth: 0, cost: 'c_8', times: '1', note: 'The length only.' },
  ],
  dominant: [4],
  bound: 'n2',
  derivation: [
    {
      label: 'Strings of length n and m',
      tex: 'T(n, m) = \\Theta(nm),\\qquad S(n, m) = 2(m + 1) = \\Theta(m)',
      text: 'The same cells are computed as by the full table, so the same time; only two rows are alive at once. Linear space, but only the length.',
    },
  ],
  sources: ['lcs/rows.ts'],
};

export const HIRSCHBERG: Pseudocode = {
  title: 'HIRSCHBERG(a, b)',
  idea: 'The subsequence in linear space. Split a in half. A two-row pass from the top gives the LCS length of the top half with every prefix of b; a pass from the bottom, of the bottom half with every suffix. Where their sum is largest, the answer crosses the middle row: solve the two halves the same way.',
  lines: [
    { code: 'if a or b is empty then return ""', depth: 0, cost: 'c_1', note: 'Once per call.' },
    { code: 'if |a| = 1 then return a if it occurs in b, else ""', depth: 0, unit: 'compares', cost: '\\le |b|', note: 'A single letter is in the LCS exactly when b contains it.' },
    { code: 'mid ← ⌊|a| / 2⌋', depth: 0, cost: 'c_3', note: '' },
    { code: 'top ← last row of LCS-TWO-ROWS(a[1..mid], b)', depth: 0, unit: 'compares', cost: '\\tfrac{|a|}{2}\\,|b|', note: 'top[k]: the LCS length of the top half with b[1..k].' },
    { code: 'bottom ← last row of LCS-TWO-ROWS(reverse a[mid+1..], reverse b)', depth: 0, unit: 'compares', cost: '\\tfrac{|a|}{2}\\,|b|', note: 'bottom[k]: the LCS length of the bottom half with the last k letters of b.' },
    { code: 'k ← the split point maximising top[k] + bottom[|b| − k]', depth: 0, unit: 'compares', cost: '|b| + 1', note: 'Where an optimal answer crosses from the top half to the bottom half.' },
    { code: 'return HIRSCHBERG(a[1..mid], b[1..k]) + HIRSCHBERG(a[mid+1..], b[k+1..])', depth: 0, cost: 'T(\\tfrac{|a|}{2}, k) + T(\\tfrac{|a|}{2}, |b| - k)', note: 'The two halves are independent: their b parts do not overlap.' },
  ],
  dominant: [4, 5],
  bound: 'n2',
  derivation: [
    {
      label: 'Time: the passes halve on each level',
      tex: '\\underbrace{nm}_{\\text{level }0} + \\underbrace{\\tfrac{nm}{2}}_{\\text{level }1} + \\underbrace{\\tfrac{nm}{4}}_{\\text{level }2} + \\dots \\le 2nm \\;\\Rightarrow\\; T(n, m) = \\Theta(nm)',
      text: 'Lines 4 and 5 compare |a| · |b| letter pairs per call. The two calls one level down split a in half and b into two parts that add up to |b|, so each level costs half the one above, and the total is at most 2nm: twice the full table, same class. Line 6 adds about m per level, m log n in all.',
    },
    {
      label: 'Space',
      tex: 'S(n, m) = \\underbrace{2(m + 1)}_{\\text{rows}} + \\underbrace{\\lceil \\log_2 n \\rceil + 1}_{\\text{stack}} = \\Theta(m + \\log n)',
      text: 'Only one pair of rows is alive at a time, and the recursion halves a, so it is about log₂ n frames deep. Linear space, like two rows, but with the subsequence, like the full table.',
    },
  ],
  sources: ['lcs/hirschberg.ts'],
};
