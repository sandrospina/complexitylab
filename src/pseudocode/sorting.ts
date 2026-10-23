import type { Pseudocode } from './types';

export const INSERTION_SORT: Pseudocode = {
  title: 'INSERTION-SORT(A)',
  idea: 'Grow a sorted prefix A[1..i−1] one element at a time: swap the new element A[i] leftwards until the element before it is not larger, like sorting a hand of cards.',
  lines: [
    { code: 'for i ← 2 to n', depth: 0, cost: 'c_1', times: 'n', note: 'Take each element after the first. The test runs n times: n − 1 passes plus the failing test.' },
    { code: 'j ← i', depth: 1, cost: 'c_2', times: 'n - 1', note: 'A[i] starts at the end of the sorted prefix.' },
    { code: 'while j > 1', depth: 1, cost: 'c_3', times: '\\sum_{i=2}^{n} t_i = \\frac{n(n+1)}{2} - 1', note: 'tᵢ is how many times this test runs for a given i: up to i, when A[i] travels all the way to the front.' },
    { code: 'if A[j − 1] ≤ A[j] then break', depth: 2, cost: 'c_4', times: '\\sum_{i=2}^{n} (t_i - 1) = \\frac{n(n-1)}{2}', note: 'The element before is not larger: A[i] has reached its place. This comparison is what the app counts.' },
    { code: 'exchange A[j − 1] with A[j]', depth: 2, cost: 'c_5', times: '\\frac{n(n-1)}{2}', note: 'Move A[i] one place left.' },
    { code: 'j ← j − 1', depth: 2, cost: 'c_6', times: '\\frac{n(n-1)}{2}', note: 'Follow it.' },
  ],
  dominant: [4, 5],
  bound: 'n2',
  derivation: [
    {
      label: 'Worst case: reversed input',
      tex: 'T(n) = c_1 n + c_2 (n-1) + c_3\\left(\\tfrac{n(n+1)}{2} - 1\\right) + (c_4 + c_5 + c_6)\\tfrac{n(n-1)}{2} = a n^2 + b n + c = \\Theta(n^2)',
      text: 'Every new element is smaller than everything before it, so it travels all the way to the front: i − 1 comparisons and swaps for element i. Adding these up gives 1 + 2 + … + (n − 1) = n(n − 1)/2, a quadratic.',
    },
    {
      label: 'Best case: sorted input',
      tex: 't_i = 1 \\;\\Rightarrow\\; T(n) = (c_1 + c_2 + c_3 + c_4)(n-1) + c_1 = \\Theta(n)',
      text: 'Each new element is already in place: one comparison, no swap. Lines 5 and 6 never run.',
    },
    {
      label: 'Average case: random order',
      tex: '\\mathbb{E}[\\text{swaps}] = \\mathbb{E}[\\text{inversions}] = \\frac{n(n-1)}{4} = \\Theta(n^2)',
      text: 'Each swap removes one inversion (a pair out of order), and a random permutation has half of all pairs inverted on average: still quadratic, with half the worst-case constant.',
    },
  ],
  sources: ['sort/insertion.ts'],
};

export const BUBBLE_SORT: Pseudocode = {
  title: 'BUBBLE-SORT(A)',
  idea: 'Sweep through A swapping adjacent pairs that are out of order; each sweep carries the largest remaining value to the end. Stop after a sweep with no swaps.',
  lines: [
    { code: 'swapped ← true; last ← n', depth: 0, cost: 'c_1', times: '1', note: 'A[last+1..n] will hold the largest values, in place.' },
    { code: 'while last > 1 and swapped', depth: 0, cost: 'c_2', times: 'n', note: 'Another sweep, unless the last one found nothing to swap: then A is sorted.' },
    { code: 'swapped ← false', depth: 1, cost: 'c_3', times: 'n - 1', note: 'Assume this sweep will find nothing.' },
    { code: 'for i ← 1 to last − 1', depth: 1, cost: 'c_4', times: '\\sum_{last=2}^{n} last = \\frac{n(n+1)}{2} - 1', note: 'Walk over the unsorted part.' },
    { code: 'if A[i] > A[i + 1]', depth: 2, cost: 'c_5', times: '\\sum_{last=2}^{n}(last - 1) = \\frac{n(n-1)}{2}', note: 'An adjacent pair out of order: the counted comparison.' },
    { code: 'exchange A[i] with A[i + 1]; swapped ← true', depth: 3, cost: 'c_6', times: '\\frac{n(n-1)}{2}', note: 'Swap them, so the larger moves right.' },
    { code: 'last ← last − 1', depth: 1, cost: 'c_7', times: 'n - 1', note: 'The largest remaining value is now at A[last].' },
  ],
  dominant: [5, 6],
  bound: 'n2',
  derivation: [
    {
      label: 'Worst case: reversed input, or just the smallest value last',
      tex: 'T(n) = (c_4 + c_5 + c_6)\\frac{n(n-1)}{2} + \\Theta(n) = \\Theta(n^2)',
      text: 'Large values move right a whole sweep at a time, but small values move left only one place per sweep. A smallest value that starts last needs n − 1 sweeps, of lengths n − 1, n − 2, …, 1: n(n − 1)/2 comparisons. (For that input only the n − 1 swaps of the 1 happen: line 6 is at most n(n − 1)/2.)',
    },
    {
      label: 'Best case: sorted input',
      tex: 'T(n) = c_5 (n-1) + \\Theta(1) = \\Theta(n)',
      text: 'The first sweep makes n − 1 comparisons and no swaps, so the loop stops. Without the swapped flag, bubble sort would be Θ(n²) even here.',
    },
  ],
  sources: ['sort/bubble.ts'],
};

export const MERGE_SORT: Pseudocode = {
  title: 'MERGE-SORT(A, p, r)',
  idea: 'Divide and conquer: sort each half recursively, then merge the two sorted halves by repeatedly taking the smaller front element. Called first with p = 1, r = n.',
  lines: [
    { code: 'if p < r', depth: 0, cost: 'c_1', times: '2n - 1', note: 'A range of one element is already sorted. One test per call: n − 1 internal calls and n leaves when n is a power of 2.' },
    { code: 'q ← ⌊(p + r) / 2⌋', depth: 1, cost: 'c_2', times: 'n - 1', note: 'Split in the middle.' },
    { code: 'MERGE-SORT(A, p, q)', depth: 1, cost: 'T(n/2)', times: 'n - 1', note: 'Sort the left half.' },
    { code: 'MERGE-SORT(A, q + 1, r)', depth: 1, cost: 'T(n/2)', times: 'n - 1', note: 'Sort the right half.' },
    { code: 'MERGE(A, p, q, r)', depth: 1, cost: '\\Theta(r - p + 1)', times: 'n - 1', note: 'Merge the two sorted halves.' },
    { code: 'copy A[p..r] into a buffer B', depth: 0, section: 'MERGE(A, p, q, r)', cost: 'c_6', times: 'n - 1', note: 'The halves are read from B while A is overwritten: r − p + 1 extra cells.' },
    { code: 'i ← p; j ← q + 1', depth: 0, cost: 'c_7', times: 'n - 1', note: 'The fronts of the left half B[p..q] and the right half B[q+1..r].' },
    { code: 'for k ← p to r', depth: 0, cost: 'c_8', times: 'n\\log_2 n + n - 1', note: 'Fill A[k], one element per iteration.' },
    { code: 'if the left half is used up then A[k] ← B[j]; j ← j + 1', depth: 1, cost: 'c_9', note: 'Only the right half is left: copy its next element.' },
    { code: 'elseif the right half is used up then A[k] ← B[i]; i ← i + 1', depth: 1, cost: 'c_{10}', note: 'Only the left half is left.' },
    { code: 'elseif B[i] ≤ B[j] then A[k] ← B[i]; i ← i + 1', depth: 1, cost: 'c_{11}', times: '\\le n\\log_2 n', note: 'Both halves have elements: the smaller front wins. Taking from the left on ties keeps the sort stable. Lines 11 and 12 are the counted comparisons.' },
    { code: 'else A[k] ← B[j]; j ← j + 1', depth: 1, cost: 'c_{12}', note: 'The right front is smaller.' },
  ],
  dominant: [11, 12],
  bound: 'nlogn',
  derivation: [
    {
      label: 'Recurrence (n a power of 2)',
      tex: 'T(n) = 2\\,T(n/2) + \\Theta(n) \\;\\Rightarrow\\; T(n) = \\Theta(n \\log n)',
      text: 'Lines 9–12 run exactly once per element merged, so a merge of r − p + 1 elements costs Θ(r − p + 1). On each level of the recursion the merges together cover all n elements, and halving gives log₂ n levels: n · log₂ n. Master theorem, case 2 (a = 2, b = 2, f(n) = Θ(n)).',
    },
    {
      label: 'Comparisons, any input',
      tex: '\\tfrac{n}{2}\\log_2 n \\;\\le\\; \\#(11) + \\#(12) \\;\\le\\; n \\log_2 n - n + 1',
      text: 'A merge of two halves of length h compares between h times (one half runs out first) and 2h − 1 times. Sorted input reaches the lower bound, so merge sort is Θ(n log n) in every case. Space: the buffer on line 6, Θ(n) cells.',
    },
  ],
  sources: ['sort/merge.ts'],
};

export const QUICKSORT: Pseudocode = {
  title: 'QUICKSORT(A, p, r)',
  idea: 'Divide and conquer the other way round: partition around a pivot x, so smaller elements end up to its left and the rest to its right, then sort each side. Called first with p = 1, r = n.',
  lines: [
    { code: 'if p < r', depth: 0, cost: 'c_1', note: 'Ranges of 0 or 1 elements are sorted.' },
    { code: 'exchange A[r] with A[RANDOM(p, r)]', depth: 1, cost: 'c_2', note: 'Random-pivot version only: pick the pivot uniformly at random. The last-pivot version skips this line and always uses A[r].' },
    { code: 'q ← PARTITION(A, p, r)', depth: 1, cost: '\\Theta(r - p + 1)', note: 'The pivot lands in its final place A[q].' },
    { code: 'QUICKSORT(A, p, q − 1)', depth: 1, cost: 'T(q - p)', note: 'Sort the smaller elements.' },
    { code: 'QUICKSORT(A, q + 1, r)', depth: 1, cost: 'T(r - q)', note: 'Sort the rest.' },
    { code: 'x ← A[r]', depth: 0, section: 'PARTITION(A, p, r)', cost: 'c_6', note: 'The pivot.' },
    { code: 'i ← p', depth: 0, cost: 'c_7', note: 'A[p..i−1] will hold the elements smaller than x.' },
    { code: 'for j ← p to r − 1', depth: 0, cost: 'c_8', note: 'Look at every element except the pivot.' },
    { code: 'if A[j] < x', depth: 1, cost: 'c_9', times: '\\frac{n(n-1)}{2}', note: 'The counted comparison: r − p of them per partition.' },
    { code: 'exchange A[i] with A[j]', depth: 2, cost: 'c_{10}', note: 'Move it into the "smaller" part.' },
    { code: 'i ← i + 1', depth: 2, cost: 'c_{11}', note: 'The smaller part grew by one.' },
    { code: 'exchange A[i] with A[r]', depth: 0, cost: 'c_{12}', note: 'Put the pivot between the two parts.' },
    { code: 'return i', depth: 0, cost: 'c_{13}', note: 'Its position.' },
  ],
  dominant: [9],
  bound: 'n2',
  derivation: [
    {
      label: 'Worst case: every pivot is the largest (sorted input, last pivot)',
      tex: 'T(n) = T(n-1) + \\Theta(n) \\;\\Rightarrow\\; \\#(9) = (n-1) + (n-2) + \\dots + 1 = \\frac{n(n-1)}{2} = \\Theta(n^2)',
      text: 'Line 9 runs r − p times per partition. If the pivot is always the maximum, one side is empty and the other has everything else, so the sizes shrink by one: a sum of 1 to n − 1. The recursion is also n deep.',
    },
    {
      label: 'Best case: every pivot is the median',
      tex: 'T(n) = 2\\,T(n/2) + \\Theta(n) \\;\\Rightarrow\\; T(n) = \\Theta(n \\log n)',
      text: 'Balanced splits give the same recurrence as merge sort.',
    },
    {
      label: 'Random pivot: expected comparisons on any input',
      tex: '\\mathbb{E}[\\#(9)] = \\sum_{i<j} \\frac{2}{j-i+1} \\approx 2n \\ln n \\approx 1.39\\, n \\log_2 n = \\Theta(n \\log n)',
      text: 'The i-th and j-th smallest values are compared exactly when one of them is the first pivot chosen among the j − i + 1 values between them, which has probability 2/(j − i + 1). No input is bad for every random choice; but many equal values still are, because line 9 sends every copy of the pivot to the same side.',
    },
  ],
  sources: ['sort/quick.ts'],
};

export const TIMSORT: Pseudocode = {
  title: 'TIMSORT(A)',
  idea: 'Use the order already in A: split it into runs that are already sorted (reversing descending ones), make short runs longer with binary insertion sort, and merge runs of similar length, galloping when one run keeps winning.',
  lines: [
    { code: 'minrun ← MIN-RUN(n); lo ← 1', depth: 0, cost: 'c_1', times: '1', note: 'minrun is between 32 and 64, chosen so n / minrun is close to a power of 2 (and minrun = n for n < 64).' },
    { code: 'while lo ≤ n', depth: 0, cost: 'c_2', note: 'One iteration per run.' },
    { code: 'find the run starting at lo; reverse it if it is strictly descending', depth: 1, unit: 'compares and swaps', cost: '1 \\text{ per element}', times: 'n - 1', note: 'Extend the run while the order holds. Strictly descending runs are reversed in place, so equal values keep their order (stability).' },
    { code: 'if the run is shorter than minrun', depth: 1, cost: 'c_4', note: 'Short runs would make too many merges.' },
    { code: 'extend it to minrun elements by binary insertion sort', depth: 2, unit: 'compares and moves', cost: 'O(\\log \\text{minrun}) + \\text{moves}', note: 'Binary search finds each new element’s place in the run, then the larger elements shift right one cell.' },
    { code: 'push the run; while the top runs break Z > Y + X or Y > X, MERGE-AT', depth: 1, cost: 'c_6', note: 'Keeping run lengths growing like Fibonacci numbers down the stack keeps merges balanced, and the stack only O(log n) deep. The check covers the top four runs: the 2015 fix found by formal verification.' },
    { code: 'lo ← lo + length of the run', depth: 1, cost: 'c_7', note: 'Next run.' },
    { code: 'while more than one run is on the stack: MERGE-AT the top two', depth: 0, cost: 'c_8', note: 'Finish the merges.' },
    { code: 'gallop past the elements of each run already in place', depth: 0, section: 'MERGE-AT(i): merge stack runs X and Y', unit: 'compares', cost: 'O(\\log n)', note: 'Exponential search finds how much of X is ≤ the first of Y, and how much of Y is ≥ the last of X: those parts need no merging.' },
    { code: 'merge one element at a time until one side wins MIN-GALLOP times in a row', depth: 0, unit: 'compares and moves', cost: '1 \\text{ per element}', note: 'Ordinary merging, through a buffer of the shorter run, from whichever end it sits at.' },
    { code: 'gallop: find how far the winning side’s lead goes, and move it as a block', depth: 0, unit: 'compares and moves', cost: 'O(\\log \\text{lead})', note: 'When data is clumpy, exponential then binary search finds the lead in O(log lead) compares instead of one per element. The threshold adapts to how well galloping is paying.' },
  ],
  dominant: [3, 5, 9, 10, 11],
  bound: 'nlogn',
  derivation: [
    {
      label: 'Sorted or reversed input: one run',
      tex: '\\#(3) = n - 1, \\text{ nothing to merge } \\;\\Rightarrow\\; T(n) = \\Theta(n)',
      text: 'Line 3 finds a single run covering A (reversing it if descending), and the stack never holds two runs. The times column shows this case.',
    },
    {
      label: 'Random input',
      tex: '\\underbrace{\\tfrac{n}{\\text{minrun}} \\cdot \\Theta(\\text{minrun} \\log \\text{minrun})}_{\\text{lines } 3\\text{–}5} + \\underbrace{\\Theta\\!\\left(n \\log \\tfrac{n}{\\text{minrun}}\\right)}_{\\text{lines } 9\\text{–}11} = \\Theta(n \\log n)',
      text: 'Natural runs are short, so almost every run is built by binary insertion sort, and the balanced merges then cost about n per level over log₂(n / minrun) levels: within a few percent of the n log₂ n lower bound for comparison sorts.',
    },
    {
      label: 'r sorted runs',
      tex: 'T(n) = O(n + n \\log r)',
      text: 'With few runs the merging is only log₂ r levels deep. For the "8 sorted runs" input that is n · (1 + log₂ 8) = 4n compares at most: linear. In general TimSort costs O(n · (1 + H)), where H is the entropy of the run lengths.',
    },
  ],
  sources: ['sort/tim.ts'],
};
