import type { Pseudocode } from './types';

export const LINEAR_SEARCH: Pseudocode = {
  title: 'LINEAR-SEARCH(A, x)',
  idea: 'Look at each element in turn until x turns up. Nothing about the array is assumed: it need not be sorted.',
  lines: [
    { code: 'for i ← 1 to n', depth: 0, cost: 'c_1', times: 'n + 1', note: 'Try each position in turn. The loop test runs once more than the body: the last test fails and ends the loop.' },
    { code: 'if A[i] = x', depth: 1, cost: 'c_2', times: 'n', note: 'One comparison per element inspected. This is the operation the app counts.' },
    { code: 'return i', depth: 2, cost: 'c_3', times: '0', note: 'Found: stop early. When x is absent (the worst case) this never runs.' },
    { code: 'return NIL', depth: 0, cost: 'c_4', times: '1', note: 'Reached only when every element has been checked.' },
  ],
  dominant: [2],
  bound: 'n',
  derivation: [
    {
      label: 'Worst case: x is absent',
      tex: 'T(n) = c_1(n+1) + c_2\\,n + c_4 = (c_1 + c_2)\\,n + (c_1 + c_4) = \\Theta(n)',
      text: 'Every line runs at most a constant number of times per element, and line 2 runs exactly n times, so the cost is a linear function of n.',
    },
    {
      label: 'Average case: x is present, at a uniformly random position',
      tex: '\\mathbb{E}[\\text{line 2}] = \\frac{1}{n}\\sum_{i=1}^{n} i = \\frac{n+1}{2} = \\Theta(n)',
      text: 'Finding x at position i costs i comparisons; averaged over the n positions that is about half the worst case, still linear.',
    },
    { label: 'Best case: x = A[1]', tex: 'T(n) = c_1 + c_2 + c_3 = \\Theta(1)', text: 'One test, one comparison, done.' },
  ],
  sources: ['search/linear.ts'],
};

export const BINARY_SEARCH: Pseudocode = {
  title: 'BINARY-SEARCH(A, x)',
  idea: 'A is sorted. Compare x with the middle element: either it is x, or x can only lie in one half. Each comparison throws away half of what is left.',
  lines: [
    { code: 'lo ← 1; hi ← n', depth: 0, cost: 'c_1', times: '1', note: 'The candidate range A[lo..hi] starts as the whole array.' },
    { code: 'while lo ≤ hi', depth: 0, cost: 'c_2', times: '\\lfloor \\log_2 n \\rfloor + 2', note: 'Stop when the range is empty: x is not there.' },
    { code: 'mid ← ⌊(lo + hi) / 2⌋', depth: 1, cost: 'c_3', times: '\\lfloor \\log_2 n \\rfloor + 1', note: 'The middle of the range.' },
    { code: 'if A[mid] = x then return mid', depth: 1, cost: 'c_4', times: '\\lfloor \\log_2 n \\rfloor + 1', note: 'One three-way comparison (=, < or >) per iteration: the counted operation.' },
    { code: 'elseif A[mid] < x then lo ← mid + 1', depth: 1, cost: 'c_5', times: '\\le \\lfloor \\log_2 n \\rfloor + 1', note: 'x can only be to the right: drop the left half and mid itself.' },
    { code: 'else hi ← mid − 1', depth: 1, cost: 'c_6', times: '\\le \\lfloor \\log_2 n \\rfloor + 1', note: 'x can only be to the left. Lines 5 and 6 together run once per iteration that does not find x.' },
    { code: 'return NIL', depth: 0, cost: 'c_7', times: '1', note: 'The range is empty.' },
  ],
  dominant: [4],
  bound: 'logn',
  derivation: [
    {
      label: 'Worst case: x is absent',
      tex: 'k \\text{ iterations leave at most } \\left\\lfloor n / 2^{k} \\right\\rfloor \\text{ candidates} \\;\\Rightarrow\\; k \\le \\lfloor \\log_2 n \\rfloor + 1 \\;\\Rightarrow\\; T(n) = \\Theta(\\log n)',
      text: 'Each iteration costs a constant and at least halves the range, which cannot be halved more than ⌊log₂ n⌋ + 1 times before it is empty. Doubling n adds just one iteration.',
    },
    { label: 'Best case: x is the first middle', tex: 'T(n) = \\Theta(1)', text: 'One iteration.' },
  ],
  sources: ['search/binary.ts'],
};

export const RECURSIVE_BINARY_SEARCH: Pseudocode = {
  title: 'RECURSIVE-BINARY-SEARCH(A, x, lo, hi)',
  idea: 'The same halving as binary search, written as a recursion: search the half where x must be. Called first with lo = 1, hi = n.',
  lines: [
    { code: 'if lo > hi then return NIL', depth: 0, cost: 'c_1', times: '\\lfloor \\log_2 n \\rfloor + 2', note: 'Base case: an empty range. Runs once per call.' },
    { code: 'mid ← ⌊(lo + hi) / 2⌋', depth: 0, cost: 'c_2', times: '\\lfloor \\log_2 n \\rfloor + 1', note: 'The middle of the range.' },
    { code: 'if A[mid] = x then return mid', depth: 0, cost: 'c_3', times: '\\lfloor \\log_2 n \\rfloor + 1', note: 'One three-way comparison per call.' },
    { code: 'elseif A[mid] < x then return RECURSIVE-BINARY-SEARCH(A, x, mid + 1, hi)', depth: 0, cost: 'c_4 + T(n/2)', note: 'Recurse into the right half.' },
    { code: 'else return RECURSIVE-BINARY-SEARCH(A, x, lo, mid − 1)', depth: 0, cost: 'c_5 + T(n/2)', note: 'Recurse into the left half.' },
  ],
  dominant: [3],
  bound: 'logn',
  derivation: [
    {
      label: 'Recurrence',
      tex: 'T(n) = T(\\lfloor n/2 \\rfloor) + c, \\quad T(0) = c_1 \\;\\Rightarrow\\; T(n) = \\Theta(\\log n)',
      text: 'Each call does a constant amount of work and makes one call on half the range. By the master theorem (a = 1, b = 2, f(n) = Θ(1) = Θ(n^{log_b a})), case 2 gives Θ(log n). Unrolled, it is c added ⌊log₂ n⌋ + 1 times. The recursion is also ⌊log₂ n⌋ + 2 frames deep, so it uses Θ(log n) stack space.',
    },
  ],
  sources: ['search/binaryRecursive.ts'],
};

export const JUMP_SEARCH: Pseudocode = {
  title: 'JUMP-SEARCH(A, x)',
  idea: 'A is sorted. Jump ahead m elements at a time until passing x, then scan back through the last block. Choosing m = √n balances the jumps against the scan.',
  lines: [
    { code: 'm ← ⌊√n⌋; lo ← 1; at ← m', depth: 0, cost: 'c_1', times: '1', note: 'The block length, and the first block A[1..m].' },
    { code: 'while at < n', depth: 0, cost: 'c_2', times: '\\lceil n/m \\rceil', note: 'Keep jumping until the last block.' },
    { code: 'if A[at] ≥ x then break', depth: 1, cost: 'c_3', times: '\\lceil n/m \\rceil - 1', note: 'The end of this block is not smaller than x, so x (if present) is in this block.' },
    { code: 'lo ← at + 1; at ← min(at + m, n)', depth: 1, cost: 'c_4', times: '\\lceil n/m \\rceil - 1', note: 'Move on to the next block.' },
    { code: 'for i ← lo to at', depth: 0, cost: 'c_5', times: '\\le m + 1', note: 'Scan the one block where x can be.' },
    { code: 'if A[i] = x then return i', depth: 1, cost: 'c_6', times: '\\le m', note: 'One comparison per element scanned.' },
    { code: 'if A[i] > x then break', depth: 1, cost: 'c_7', times: '\\le 1', note: 'Passed where x would be: it is absent.' },
    { code: 'return NIL', depth: 0, cost: 'c_8', times: '1', note: 'x is not in A.' },
  ],
  dominant: [3, 6],
  bound: 'sqrtn',
  derivation: [
    {
      label: 'Worst case: x is absent, beyond the last element',
      tex: 'T(n) \\approx c\\left(\\frac{n}{m} + m\\right), \\quad \\frac{d}{dm}\\left(\\frac{n}{m} + m\\right) = 0 \\Rightarrow m = \\sqrt n \\;\\Rightarrow\\; T(n) \\approx 2c\\sqrt n = \\Theta(\\sqrt n)',
      text: 'Line 3 runs about n/m times (one per block) and line 6 at most m times (one block). Larger blocks mean fewer jumps but a longer scan; the sum is smallest when the two are equal, at m = √n, so at most about 2√n comparisons.',
    },
  ],
  sources: ['search/jump.ts'],
};

export const INTERPOLATION_SEARCH: Pseudocode = {
  title: 'INTERPOLATION-SEARCH(A, x)',
  idea: 'A is sorted. Instead of the middle, probe where x would sit if the values between A[lo] and A[hi] grew evenly, as you would open a phone book near "S".',
  lines: [
    { code: 'lo ← 1; hi ← n', depth: 0, cost: 'c_1', times: '1', note: 'The candidate range.' },
    { code: 'while lo ≤ hi', depth: 0, cost: 'c_2', times: 'n - 1', note: 'Stop when the range is empty.' },
    { code: 'if x < A[lo] or x > A[hi] then break', depth: 1, cost: 'c_3', times: 'n - 1', note: 'x is outside the values of the range, so it cannot be there.' },
    { code: 'pos ← lo + ⌊(x − A[lo]) · (hi − lo) / (A[hi] − A[lo])⌋', depth: 1, cost: 'c_4', times: 'n - 1', note: 'The position x would have if the values rose in a straight line from A[lo] to A[hi].' },
    { code: 'if A[pos] = x then return pos', depth: 1, cost: 'c_5', times: 'n - 1', note: 'One probe: the counted comparison, with line 3.' },
    { code: 'elseif A[pos] < x then lo ← pos + 1', depth: 1, cost: 'c_6', times: 'n - 2', note: 'x is to the right of the guess.' },
    { code: 'else hi ← pos − 1', depth: 1, cost: 'c_7', times: '0', note: 'x is to the left of the guess.' },
    { code: 'return NIL', depth: 0, cost: 'c_8', times: '0', note: 'x is not in A.' },
  ],
  dominant: [3, 5],
  bound: 'n',
  derivation: [
    {
      label: 'Worst case: one huge value (the "skewed" input)',
      tex: 'A = \\langle 0, 1, \\dots, n-2, n^2 \\rangle,\\; x = n-2: \\quad pos = lo + \\left\\lfloor \\tfrac{(n-2-lo)(n-1-lo)}{n^2 - lo} \\right\\rfloor = lo \\;\\Rightarrow\\; T(n) = \\Theta(n)',
      text: 'The huge last value makes every guess land on lo, so each probe moves the range by one place: n − 1 probes before x is found, as slow as linear search. The times column shows this case.',
    },
    {
      label: 'Average case: values spread evenly at random',
      tex: '\\mathbb{E}[\\text{probes}] = \\Theta(\\log \\log n)',
      text: 'When the values are uniformly distributed, each probe shrinks the expected range from about n to about √n (Perl, Itai and Avni, 1978; Yao and Yao, 1976). Taking square roots k times reaches a constant after k ≈ log₂ log₂ n probes: about 5 for a million elements.',
    },
    { label: 'Best case: evenly spaced values', tex: 'T(n) = \\Theta(1)', text: 'If A[i] grows by exactly the same step each time, the first guess is exact.' },
  ],
  sources: ['search/interpolation.ts'],
};
