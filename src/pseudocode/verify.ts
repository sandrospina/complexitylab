import type { Pseudocode } from './types';

export const SUDOKU_CHECK: Pseudocode = {
  title: 'SUDOKU-CHECK(B)',
  idea: 'A filled s × s board is a solution exactly when each of its 3s units (rows, columns and boxes) holds every digit once. Checking is one pass per unit with a "seen" marker per digit.',
  lines: [
    { code: 'seen[1..s] ← unused', depth: 0, cost: 'c_1', times: '1', note: 'One marker per digit. Stamping it with the unit number avoids clearing it between units.' },
    { code: 'for each of the 3s units U', depth: 0, cost: 'c_2', times: '3s', note: 's rows, s columns, s boxes.' },
    { code: 'for each cell x of U', depth: 1, cost: 'c_3', times: '3s^2', note: 's cells per unit: every cell is read three times in all.' },
    { code: 'if B[x] is blank, or seen[B[x]] = U, then return INVALID', depth: 2, cost: 'c_4', times: '3s^2', note: 'A blank, or a digit already seen in this unit: the counted compare.' },
    { code: 'seen[B[x]] ← U', depth: 2, cost: 'c_5', times: '3s^2', note: '' },
    { code: 'return VALID', depth: 0, cost: 'c_6', times: '1', note: 'Every unit holds every digit once.' },
  ],
  dominant: [3, 4, 5],
  bound: 'n2',
  derivation: [
    {
      label: 'A valid board (the worst case: nothing ends the check early)',
      tex: 'T(s) = (c_3 + c_4 + c_5)\\,3s^2 + c_2\\,3s + \\Theta(1) = \\Theta(s^2)',
      text: 'Quadratic in the side, which is linear in the number of cells N = s²: the checker reads each cell a constant number of times. For a 9 × 9 board, 243 cell visits, whatever the puzzle.',
    },
  ],
  sources: ['sudoku/check.ts'],
};

export const SUDOKU_SOLVE: Pseudocode = {
  title: 'SUDOKU-SOLVE(B)',
  idea: 'Backtracking: fill the blanks in row-major order, trying values 1, 2, … in each. When a blank has no value that fits, go back to the previous blank and try its next value.',
  lines: [
    { code: 'blanks ← the empty cells in row-major order; d ← 1', depth: 0, cost: 'c_1', times: '1', note: 'd is the blank being filled.' },
    { code: 'while 1 ≤ d ≤ |blanks|', depth: 0, cost: 'c_2', note: 'One iteration per forward step or backtrack.' },
    { code: 'for v ← (the last value tried at blank d) + 1 to s', depth: 1, cost: 'c_3', note: 'Resume where this blank left off.' },
    { code: 'if v clashes with none of the cell’s peers then place v; break', depth: 2, unit: 'peer compares', cost: '\\le 3s', note: 'A cell has 2(s − 1) + (r − 1)(c − 1) peers (row, column, box): 20 on a 9 × 9 board. Stop at the first clash.' },
    { code: 'if a value was placed then d ← d + 1', depth: 1, cost: 'c_5', note: 'Go forward.' },
    { code: 'else clear blank d − 1; d ← d − 1 (backtrack)', depth: 1, cost: 'c_6', note: 'Every value failed: an earlier choice was wrong.' },
    { code: 'return the board if d > |blanks|, else NO SOLUTION', depth: 0, cost: 'c_7', times: '1', note: '' },
  ],
  dominant: [4],
  bound: 'expc',
  derivation: [
    {
      label: 'Worst case: the search tree',
      tex: 'T(b) \\le \\underbrace{s^{\\,b}}_{\\text{value choices}} \\cdot \\underbrace{3s}_{\\text{peer checks}} = O(s^{\\,b} \\cdot s)',
      text: 'With b blanks there are at most sᵇ ways to fill them, and backtracking may try a large share of them. Checking peers on every placement prunes most branches early, so the real base is far below s: on this page, measured over many random puzzles, cost grows like about 1.2ᵇ (see the scaling plot), still exponential.',
    },
    {
      label: 'Against the checker',
      tex: '\\text{check: } \\Theta(s^2) \\qquad \\text{solve: exponential in } b',
      text: 'Verifying a proposed answer is cheap and predictable; finding one is not. That asymmetry is the difference between NP problems and the problems we know how to solve fast.',
    },
  ],
  sources: ['sudoku/solve.ts'],
};

export const VERIFY_SUBSET_SUM: Pseudocode = {
  title: 'VERIFY-SUBSET-SUM(A, t, C)',
  idea: 'C is a claimed certificate: a list of indices into A whose values should add up to t. Check each index is valid and used once, and add up the values.',
  lines: [
    { code: 'used[1..n] ← false; sum ← 0', depth: 0, cost: 'c_1', times: '1', note: '' },
    { code: 'for each i in C', depth: 0, cost: 'c_2', times: '|C| + 1', note: '' },
    { code: 'if i is out of range, or used[i], then REJECT', depth: 1, cost: 'c_3', times: '|C|', note: 'An invalid or repeated index (two counted compares).' },
    { code: 'used[i] ← true; sum ← sum + A[i]', depth: 1, cost: 'c_4', times: '|C|', note: '' },
    { code: 'if sum = t then ACCEPT else REJECT', depth: 0, cost: 'c_5', times: '1', note: 'The final compare.' },
  ],
  dominant: [3, 4],
  bound: 'n',
  derivation: [
    {
      label: 'Any certificate',
      tex: 'T = (c_2 + c_3 + c_4)\\,|C| + \\Theta(1) = O(n) \\quad (|C| \\le n)',
      text: 'One pass over the certificate. Polynomial verification of a short certificate is exactly what puts subset sum in NP.',
    },
  ],
  sources: ['subset-sum/verify.ts'],
};

export const SUBSET_SUM_SEARCH: Pseudocode = {
  title: 'SUBSET-SUM-SEARCH(A, t)',
  idea: 'Try the subsets of A in Gray-code order, one element added or removed per step, until one adds up to t.',
  lines: [
    { code: 'chosen ← ∅; sum ← 0; if t = 0 then return ∅', depth: 0, cost: 'c_1', times: '1', note: 'The empty subset.' },
    { code: 'for k ← 1 to 2ⁿ − 1', depth: 0, cost: 'c_2', times: '2^n', note: 'Every other subset.' },
    { code: 'i ← the position of the lowest set bit of k', depth: 1, cost: 'c_3', times: '2^n - 1', note: '' },
    { code: 'flip A[i] in or out of chosen; update sum', depth: 1, cost: 'c_4', times: '2^n - 1', note: 'Θ(1) per subset.' },
    { code: 'if sum = t then return chosen', depth: 1, cost: 'c_5', times: '2^n - 1', note: 'The counted compare.' },
    { code: 'return NONE', depth: 0, cost: 'c_6', times: '1', note: '' },
  ],
  dominant: [3, 4, 5],
  bound: 'exp2',
  derivation: [
    {
      label: 'Worst case: no subset works',
      tex: 'T(n) = (c_2 + c_3 + c_4 + c_5)(2^n - 1) + \\Theta(1) = \\Theta(2^n)',
      text: 'All 2ⁿ subsets are tried. The scaling plot measures it on even numbers with an odd target, which no subset can hit. Against the verifier’s O(n), this is the verify-versus-solve gap.',
    },
  ],
  sources: ['subset-sum/brute.ts'],
};
