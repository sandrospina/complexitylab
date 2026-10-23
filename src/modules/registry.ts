// Pure TypeScript: imported by the benchmark worker, so no React or DOM here.
import { cycleFloyd } from '../algorithms/cycle/floyd';
import { cycleHash } from '../algorithms/cycle/hash';
import { CYCLE_KINDS, makeCycleInput } from '../algorithms/cycle/input';
import type { CycleInput, CycleKind, CycleResult } from '../algorithms/cycle/input';
import { FIB_INPUT_KINDS, makeFibInput } from '../algorithms/fib/input';
import type { FibInput, FibInputKind } from '../algorithms/fib/input';
import { fibIterative } from '../algorithms/fib/iterative';
import { fibMemo, fibNaive } from '../algorithms/fib/recursive';
import { bfs } from '../algorithms/graph/bfs';
import { dfs } from '../algorithms/graph/dfs';
import { dijkstraArray } from '../algorithms/graph/dijkstra-array';
import { dijkstraHeap } from '../algorithms/graph/dijkstra-heap';
import { DIJKSTRA_KINDS, makeDijkstraInput, makeTraversalInput, TRAVERSAL_KINDS } from '../algorithms/graph/input';
import type { DijkstraKind, GraphInput, TraversalKind } from '../algorithms/graph/input';
import { binarySearch } from '../algorithms/search/binary';
import { binarySearchRecursive } from '../algorithms/search/binaryRecursive';
import { interpolationSearch } from '../algorithms/search/interpolation';
import { jumpSearch } from '../algorithms/search/jump';
import { makeSearchInput, SEARCH_INPUT_KINDS } from '../algorithms/search/input';
import type { SearchInput, SearchInputKind } from '../algorithms/search/input';
import { linearSearch } from '../algorithms/search/linear';
import { makeSortInput, SORT_INPUT_KINDS } from '../algorithms/sort/input';
import type { SortInput, SortInputKind } from '../algorithms/sort/input';
import { bubbleSort } from '../algorithms/sort/bubble';
import { insertionSort } from '../algorithms/sort/insertion';
import { timSort } from '../algorithms/sort/tim';
import { mergeSort } from '../algorithms/sort/merge';
import { quickNaive, quickRandom } from '../algorithms/sort/quick';
import { knapsackBrute } from '../algorithms/knapsack/brute';
import { knapsackDp } from '../algorithms/knapsack/dp';
import { makeKnapsackInput } from '../algorithms/knapsack/input';
import type { KnapsackInput, KnapsackKind, KnapsackResult } from '../algorithms/knapsack/input';
import { subsetSumBrute } from '../algorithms/subset-sum/brute';
import { makeSolveInput as makeSubsetSumInput, makeVerifyInput } from '../algorithms/subset-sum/input';
import type { Certificate, SubsetSumInput } from '../algorithms/subset-sum/input';
import { verifySubsetSum } from '../algorithms/subset-sum/verify';
import type { VerifyResult } from '../algorithms/subset-sum/verify';
import type { Graph } from '../algorithms/graph/graph';
import { randomCircuit } from '../algorithms/reductions/circuit';
import type { Circuit } from '../algorithms/reductions/circuit';
import { clique } from '../algorithms/reductions/clique';
import type { CliqueInstance } from '../algorithms/reductions/clique';
import { coloring } from '../algorithms/reductions/coloring';
import { cookLevin } from '../algorithms/reductions/cook-levin';
import type { MachineRun } from '../algorithms/reductions/cook-levin';
import { gnp, randomGraph } from '../algorithms/reductions/graph-util';
import { hamiltonian } from '../algorithms/reductions/hamiltonian';
import { sudoku } from '../algorithms/reductions/sudoku';
import { tseitin } from '../algorithms/reductions/tseitin';
import type { Encoding, ReductionInput } from '../algorithms/reductions/types';
import { dpll } from '../algorithms/sat/dpll';
import { makeSatInput } from '../algorithms/sat/input';
import type { SatInput, SatKind, SatResult } from '../algorithms/sat/input';
import { truthTable } from '../algorithms/sat/truth-table';
import { blank, BOX_SHAPES, makeCheckInput, makeSolveInput, solvedBoard } from '../algorithms/sudoku/board';
import type { Board } from '../algorithms/sudoku/board';
import { checkSudoku } from '../algorithms/sudoku/check';
import type { CheckResult } from '../algorithms/sudoku/check';
import { solveSudoku } from '../algorithms/sudoku/solve';
import { tspBrute } from '../algorithms/tsp/brute';
import { tspHeldKarp } from '../algorithms/tsp/held-karp';
import { tspHeuristic } from '../algorithms/tsp/heuristic';
import { makeTspInput } from '../algorithms/tsp/input';
import type { TspInput, TspKind, TspResult } from '../algorithms/tsp/input';
import type { ComplexityClass } from '../engine/complexity';
import type { OpKind } from '../engine/events';
import type { Rng } from '../engine/rng';
import type { Algorithm } from '../engine/runner';

export interface AlgorithmSpec<I, R, K extends string = string> {
  /** Globally unique, "<module>/<algorithm>". */
  id: string;
  name: string;
  generator: Algorithm<I, R>;
  /** `random` kinds are averaged over several trials per n in benchmarks. */
  inputKinds: InputKindSpec<K>[];
  /** `param` is a kind-specific knob (e.g. average degree); each kind has a default when it is omitted. */
  makeInput: (n: number, kind: K, rng: Rng, param?: number) => I;
  /** Largest n the animation accepts. */
  maxAnimN: number;
  /** Largest n the benchmark runs (a power of two); beyond it the scaling view extrapolates. */
  maxBenchN: number;
  /** Benchmark sizes, when powers of two from 16 grow too fast (e.g. exponential algorithms). */
  benchSizes?: number[];
  /** Which count the scaling view plots; 'total' sums every counted op. */
  metric: OpKind | 'total';
  /** The textbook bound for each input kind; the registry test checks the instrumentation against it. */
  expected: Record<K, ComplexityClass>;
  /** The textbook bound on peak memory (cells + stack frames), audited like `expected`. */
  expectedMem?: Record<K, ComplexityClass>;
}

export interface InputKindSpec<K extends string = string> {
  id: K;
  label: string;
  random?: boolean;
  /** Benchmark sizes for this kind, overriding the spec's; used when n means something else here. */
  sizes?: number[];
  /** What n measures for this kind, e.g. "bits of W"; defaults to the input size. */
  xLabel?: string;
  /** 'median' of the trials per n, for random kinds whose cost is heavy-tailed. */
  aggregate?: 'mean' | 'median';
  /** Trials per n for random kinds, when the default is too noisy for the fit. */
  trials?: number;
}

export type AnyAlgorithmSpec = AlgorithmSpec<unknown, unknown>;

function define<I, R, K extends string>(spec: AlgorithmSpec<I, R, K>): AnyAlgorithmSpec {
  return spec as unknown as AnyAlgorithmSpec;
}

/**
 * Benchmark sizes for a spec on an input kind: the kind's own list, else the spec's, else
 * powers of two from 16 up to its maxBenchN.
 */
export function benchSizes(spec: AnyAlgorithmSpec, kind?: string): number[] {
  const own = spec.inputKinds.find((k) => k.id === kind)?.sizes;
  if (own) return own;
  if (spec.benchSizes) return spec.benchSizes.filter((n) => n <= spec.maxBenchN);
  const sizes: number[] = [];
  for (let n = 16; n <= spec.maxBenchN; n *= 2) sizes.push(n);
  return sizes;
}

export interface ModuleSpec {
  id: string;
  title: string;
  algorithms: AnyAlgorithmSpec[];
}

/**
 * O(log log n) barely moves over the sizes we can run (2 to 4.2 for n up to 2¹⁸), so
 * interpolation search on spread values averages many more inputs per n than the default.
 */
const INTERPOLATION_KINDS = SEARCH_INPUT_KINDS.map((k) =>
  k.id === 'uniform' ? { ...k, trials: 256, sizes: Array.from({ length: 15 }, (_, i) => 2 ** (i + 4)) } : k,
);

const search = (
  s: Omit<AlgorithmSpec<SearchInput, number, SearchInputKind>, 'inputKinds' | 'makeInput' | 'maxAnimN' | 'maxBenchN' | 'metric'> &
    Partial<Pick<AlgorithmSpec<SearchInput, number, SearchInputKind>, 'inputKinds'>>,
) =>
  define<SearchInput, number, SearchInputKind>({
    inputKinds: SEARCH_INPUT_KINDS,
    makeInput: makeSearchInput,
    maxAnimN: 64,
    maxBenchN: 2 ** 20,
    metric: 'compare',
    ...s,
  });

const sort = (s: Omit<AlgorithmSpec<SortInput, number[], SortInputKind>, 'inputKinds' | 'makeInput' | 'maxAnimN' | 'metric'>) =>
  define<SortInput, number[], SortInputKind>({
    inputKinds: SORT_INPUT_KINDS,
    makeInput: makeSortInput,
    maxAnimN: 48,
    metric: 'compare',
    ...s,
  });

/** Linear sizes: fib(n) for even n, since naive recursion runs out of budget in the low 30s. */
const FIB_SIZES = Array.from({ length: 19 }, (_, i) => 4 + 2 * i);

const fib = (s: Omit<AlgorithmSpec<FibInput, bigint, FibInputKind>, 'inputKinds' | 'makeInput' | 'metric' | 'benchSizes'>) =>
  define<FibInput, bigint, FibInputKind>({
    inputKinds: FIB_INPUT_KINDS,
    makeInput: makeFibInput,
    metric: 'total',
    benchSizes: FIB_SIZES,
    ...s,
  });

type GraphSpec<K extends string> = Omit<
  AlgorithmSpec<GraphInput, number[], K>,
  'inputKinds' | 'makeInput' | 'maxAnimN' | 'maxBenchN' | 'metric'
>;

// n is the number of vertices; the editor's graphs are what the animation shows.
const traversal = (s: GraphSpec<TraversalKind>) =>
  define<GraphInput, number[], TraversalKind>({
    inputKinds: TRAVERSAL_KINDS,
    makeInput: makeTraversalInput,
    maxAnimN: 30,
    maxBenchN: 2 ** 11,
    metric: 'total',
    ...s,
  });

const dijkstra = (s: GraphSpec<DijkstraKind>) =>
  define<GraphInput, number[], DijkstraKind>({
    inputKinds: DIJKSTRA_KINDS,
    makeInput: makeDijkstraInput,
    maxAnimN: 30,
    maxBenchN: 2 ** 10,
    metric: 'total',
    ...s,
  });

/** Even n up to `to`, for exponential algorithms. */
const evens = (from: number, to: number) => Array.from({ length: (to - from) / 2 + 1 }, (_, i) => from + 2 * i);

const BITS_SIZES = evens(4, 18);

/** Knapsack kinds; `items` sizes are the spec's own (exponential brute force needs small n). */
const knapsackKinds = (items?: number[]): InputKindSpec<KnapsackKind>[] => [
  { id: 'items', label: 'n items, capacity W = 8n', random: true, sizes: items },
  { id: 'bits', label: '10 items, capacity W = 2ᵇ − 1', random: true, sizes: BITS_SIZES, xLabel: 'bits of W' },
];

const knapsack = (s: Omit<AlgorithmSpec<KnapsackInput, KnapsackResult, KnapsackKind>, 'makeInput' | 'metric' | 'maxAnimN'>) =>
  define<KnapsackInput, KnapsackResult, KnapsackKind>({ makeInput: makeKnapsackInput, metric: 'total', maxAnimN: 8, ...s });

const tsp = (s: Omit<AlgorithmSpec<TspInput, TspResult, TspKind>, 'inputKinds' | 'makeInput' | 'metric'>) =>
  define<TspInput, TspResult, TspKind>({
    inputKinds: [{ id: 'random', label: 'Cities uniform in a square', random: true }],
    makeInput: makeTspInput,
    metric: 'total',
    ...s,
  });

/** The truth table's worst case: random 3-SAT far above the threshold, almost surely unsatisfiable. */
const SAT_UNSAT: InputKindSpec<SatKind> = { id: 'unsat', label: 'Random 3-SAT at ratio 10 (unsatisfiable)', random: true, sizes: evens(4, 20) };

/**
 * Search at the satisfiability threshold, by the median (costs are heavy-tailed). Below ~20
 * variables DPLL's cost is mostly per-node propagation, not search, so sizes start there.
 */
const satThreshold = (sizes: number[]): InputKindSpec<SatKind> => ({
  id: 'threshold',
  label: 'Random 3-SAT at ratio 4.26',
  random: true,
  aggregate: 'median',
  sizes,
  xLabel: 'variables n',
});

const steps = (from: number, to: number, by: number) => Array.from({ length: (to - from) / by + 1 }, (_, i) => from + by * i);

/** DPLL variants share one generator and differ in the options their inputs carry. */
const sat = (
  s: Omit<AlgorithmSpec<SatInput, SatResult, SatKind>, 'metric' | 'maxAnimN' | 'generator' | 'maxBenchN' | 'expected'> & {
    generator?: AlgorithmSpec<SatInput, SatResult, SatKind>['generator'];
    expected: Partial<Record<SatKind, ComplexityClass>>;
  },
) =>
  define<SatInput, SatResult, SatKind>({
    metric: 'total',
    maxAnimN: 20,
    generator: dpll,
    maxBenchN: 100,
    ...s,
    // Each spec lists only the kinds it is audited on: the truth table's worst case, or the threshold.
    expected: s.expected as Record<SatKind, ComplexityClass>,
  });

/**
 * Encoders count one write per clause, so their "ops" are the encoding's size: the audit
 * checks that each reduction stays polynomial, and by how much.
 */
const encoder = <I, K extends string>(
  s: Omit<AlgorithmSpec<ReductionInput<I>, Encoding, K>, 'metric' | 'maxAnimN' | 'makeInput' | 'expected'> & {
    instance: (n: number, rng: Rng) => I;
    expected: ComplexityClass;
  },
) => {
  const { instance, expected, ...rest } = s;
  const kind = rest.inputKinds[0]!.id;
  return define<ReductionInput<I>, Encoding, K>({
    metric: 'write',
    maxAnimN: 30,
    makeInput: (n, _kind, rng) => ({ instance: instance(n, rng), omit: [] }),
    expected: { [kind]: expected } as Record<K, ComplexityClass>,
    ...rest,
  });
};

/** n is the length of the sequence before it repeats: tail plus loop. */
const cycle = (s: Omit<AlgorithmSpec<CycleInput, CycleResult, CycleKind>, 'inputKinds' | 'makeInput' | 'metric' | 'maxAnimN' | 'maxBenchN'>) =>
  define<CycleInput, CycleResult, CycleKind>({
    inputKinds: CYCLE_KINDS,
    makeInput: makeCycleInput,
    metric: 'total',
    maxAnimN: 40,
    maxBenchN: 2 ** 16,
    ...s,
  });

export const MODULES: ModuleSpec[] = [
  {
    id: 'search',
    title: 'Search',
    algorithms: [
      search({ id: 'search/linear', name: 'Linear search', generator: linearSearch, expected: { worst: 'n', random: 'n', uniform: 'n', skewed: 'n' } }),
      search({ id: 'search/binary', name: 'Binary search', generator: binarySearch, expected: { worst: 'logn', random: 'logn', uniform: 'logn', skewed: 'logn' } }),
      search({
        id: 'search/binary-recursive',
        name: 'Binary search (recursive)',
        generator: binarySearchRecursive,
        expected: { worst: 'logn', random: 'logn', uniform: 'logn', skewed: 'logn' },
      }),
      search({ id: 'search/jump', name: 'Jump search', generator: jumpSearch, expected: { worst: 'sqrtn', random: 'sqrtn', uniform: 'sqrtn', skewed: 'sqrtn' } }),
      search({
        id: 'search/interpolation',
        name: 'Interpolation search',
        generator: interpolationSearch,
        inputKinds: INTERPOLATION_KINDS,
        // Evenly spaced values put the first guess right on the target; an absent target above
        // the range fails the first range check. Random spacing costs log log n, a skewed array n.
        expected: { worst: '1', random: '1', uniform: 'loglogn', skewed: 'n' },
      }),
    ],
  },
  {
    id: 'sorting',
    title: 'Sorting',
    algorithms: [
      sort({
        id: 'sorting/bubble',
        name: 'Bubble sort',
        generator: bubbleSort,
        maxBenchN: 2 ** 12,
        // The early exit makes sorted input one pass; few-unique values still need many passes.
        expected: { random: 'n2', sorted: 'n', reversed: 'n2', fewUnique: 'n2', runs: 'n2' },
      }),
      sort({
        id: 'sorting/insertion',
        name: 'Insertion sort',
        generator: insertionSort,
        maxBenchN: 2 ** 12,
        expected: { random: 'n2', sorted: 'n', reversed: 'n2', fewUnique: 'n2', runs: 'n2' },
      }),
      sort({
        id: 'sorting/tim',
        name: 'TimSort',
        generator: timSort,
        maxBenchN: 2 ** 16,
        // Sorted and reversed are one run; 8 runs cost n·(1 + log₂ 8). With 4 distinct values,
        // runs absorb equal neighbours and galloping copies equal blocks whole: linear too.
        expected: { random: 'nlogn', sorted: 'n', reversed: 'n', fewUnique: 'n', runs: 'n' },
      }),
      sort({
        id: 'sorting/merge',
        name: 'Merge sort',
        generator: mergeSort,
        maxBenchN: 2 ** 16,
        expected: { random: 'nlogn', sorted: 'nlogn', reversed: 'nlogn', fewUnique: 'nlogn', runs: 'nlogn' },
      }),
      sort({
        id: 'sorting/quick-naive',
        name: 'Quicksort (last pivot)',
        generator: quickNaive,
        maxBenchN: 2 ** 12,
        // Each sorted run ends in its maximum, so the last pivot is lopsided inside runs too.
        expected: { random: 'nlogn', sorted: 'n2', reversed: 'n2', fewUnique: 'n2', runs: 'n2' },
      }),
      sort({
        id: 'sorting/quick-random',
        name: 'Quicksort (random pivot)',
        generator: quickRandom,
        maxBenchN: 2 ** 12,
        // Lomuto puts every copy of the pivot on one side, so duplicates defeat random pivots.
        expected: { random: 'nlogn', sorted: 'nlogn', reversed: 'nlogn', fewUnique: 'n2', runs: 'nlogn' },
      }),
    ],
  },
  {
    id: 'time-space',
    title: 'Time–space',
    algorithms: [
      fib({
        id: 'time-space/naive',
        name: 'Naive recursion',
        generator: fibNaive,
        maxAnimN: 14,
        maxBenchN: 30,
        expected: { n: 'expPhi' },
        expectedMem: { n: 'n' },
      }),
      fib({
        id: 'time-space/memo',
        name: 'Memoised recursion',
        generator: fibMemo,
        maxAnimN: 40,
        maxBenchN: 40,
        expected: { n: 'n' },
        expectedMem: { n: 'n' },
      }),
      fib({
        id: 'time-space/iterative',
        name: 'Iterative',
        generator: fibIterative,
        maxAnimN: 40,
        maxBenchN: 40,
        expected: { n: 'n' },
        expectedMem: { n: '1' },
      }),
      cycle({
        id: 'time-space/cycle-hash',
        name: 'Hash set',
        generator: cycleHash,
        expected: { balanced: 'n', tail: 'n', loop: 'n', random: 'n' },
        expectedMem: { balanced: 'n', tail: 'n', loop: 'n', random: 'n' },
      }),
      cycle({
        id: 'time-space/cycle-floyd',
        name: "Floyd's tortoise and hare",
        generator: cycleFloyd,
        expected: { balanced: 'n', tail: 'n', loop: 'n', random: 'n' },
        expectedMem: { balanced: '1', tail: '1', loop: '1', random: '1' },
      }),
    ],
  },
  {
    id: 'graphs',
    title: 'Graphs',
    algorithms: [
      traversal({ id: 'graphs/bfs', name: 'BFS', generator: bfs, expected: { tree: 'n', path: 'n', grid: 'n', dense: 'n2' } }),
      traversal({ id: 'graphs/dfs', name: 'DFS', generator: dfs, expected: { tree: 'n', path: 'n', grid: 'n', dense: 'n2' } }),
      dijkstra({
        id: 'graphs/dijkstra-array',
        name: 'Dijkstra (array)',
        generator: dijkstraArray,
        expected: { degree: 'n2', complete: 'n2' },
      }),
      dijkstra({
        id: 'graphs/dijkstra-heap',
        name: 'Dijkstra (binary heap)',
        generator: dijkstraHeap,
        expected: { degree: 'nlogn', complete: 'n2logn' },
      }),
    ],
  },
  {
    id: 'verify',
    title: 'Verify vs solve',
    algorithms: [
      define<Board, CheckResult, 'side'>({
        id: 'verify/sudoku-check',
        name: 'Sudoku checker',
        generator: checkSudoku,
        inputKinds: [
          { id: 'side', label: 'Solved board of side s', sizes: [4, 6, 8, 9, 10, 12, 15, 16, 20, 25], xLabel: 'board side s' },
        ],
        makeInput: makeCheckInput,
        maxAnimN: 9,
        maxBenchN: 25,
        metric: 'total',
        // s² cells, each read in its row, column and box.
        expected: { side: 'n2' },
      }),
      define<Board, Board | undefined, 'blanks'>({
        id: 'verify/sudoku-solve',
        name: 'Sudoku solver (backtracking)',
        generator: solveSudoku,
        inputKinds: [
          {
            id: 'blanks',
            label: 'Blank cells on a fixed 9 × 9',
            random: true,
            // Below ~32 blanks the cost is mostly checking placements, not backtracking.
            sizes: [32, 36, 40, 44, 48, 52, 56],
            xLabel: 'blank cells',
            aggregate: 'median',
          },
        ],
        makeInput: makeSolveInput,
        maxAnimN: 81,
        maxBenchN: 81,
        metric: 'total',
        expected: { blanks: 'expc' },
      }),
      define<Certificate, VerifyResult, 'valid'>({
        id: 'verify/subset-check',
        name: 'Subset-sum verifier',
        generator: verifySubsetSum,
        inputKinds: [{ id: 'valid', label: 'n numbers and a valid certificate', random: true }],
        makeInput: makeVerifyInput,
        maxAnimN: 16,
        maxBenchN: 2 ** 16,
        metric: 'total',
        expected: { valid: 'n' },
      }),
      define<SubsetSumInput, number[] | undefined, 'none'>({
        id: 'verify/subset-solve',
        name: 'Subset-sum search',
        generator: subsetSumBrute,
        inputKinds: [{ id: 'none', label: 'Even numbers, odd target (no solution)', random: true }],
        makeInput: makeSubsetSumInput,
        maxAnimN: 16,
        maxBenchN: 22,
        benchSizes: evens(4, 22),
        metric: 'total',
        expected: { none: 'exp2' },
      }),
    ],
  },
  {
    id: 'knapsack',
    title: 'Knapsack',
    algorithms: [
      knapsack({
        id: 'knapsack/brute',
        name: 'Brute force (all subsets)',
        generator: knapsackBrute,
        inputKinds: knapsackKinds(evens(4, 22)),
        maxBenchN: 22,
        expected: { items: 'exp2', bits: '1' },
        expectedMem: { items: 'n', bits: '1' },
      }),
      knapsack({
        id: 'knapsack/dp',
        name: 'Dynamic programming',
        generator: knapsackDp,
        inputKinds: knapsackKinds(),
        maxBenchN: 2 ** 9,
        expected: { items: 'n2', bits: 'exp2' },
        expectedMem: { items: 'n2', bits: 'exp2' },
      }),
    ],
  },
  {
    id: 'tsp',
    title: 'TSP',
    algorithms: [
      tsp({ id: 'tsp/brute', name: 'Brute force (all tours)', generator: tspBrute, maxAnimN: 10, maxBenchN: 10, benchSizes: [4, 5, 6, 7, 8, 9, 10], expected: { random: 'fact' } }),
      tsp({
        id: 'tsp/held-karp',
        name: 'Held–Karp',
        generator: tspHeldKarp,
        maxAnimN: 16,
        maxBenchN: 16,
        benchSizes: [4, 6, 8, 10, 12, 14, 16],
        expected: { random: 'n2exp2' },
      }),
      tsp({
        id: 'tsp/heuristic',
        name: 'Nearest neighbour + 2-opt',
        generator: tspHeuristic,
        maxAnimN: 20,
        maxBenchN: 2 ** 9,
        // Nearest neighbour is n²; 2-opt passes are n² each and grow slowly in number (≈ log n).
        expected: { random: 'n2logn' },
      }),
    ],
  },
  {
    id: 'sat',
    title: 'SAT',
    algorithms: [
      sat({
        id: 'sat/truth-table',
        name: 'Truth table',
        generator: truthTable,
        inputKinds: [SAT_UNSAT],
        makeInput: makeSatInput({ heuristic: 'first', propagate: false, pure: false }),
        expected: { unsat: 'exp2' },
      }),
      sat({
        id: 'sat/backtracking',
        name: 'Backtracking',
        inputKinds: [satThreshold(evens(8, 24))],
        makeInput: makeSatInput({ heuristic: 'first', propagate: false, pure: false }),
        expected: { threshold: 'expc' },
      }),
      sat({
        id: 'sat/dpll-first',
        name: 'DPLL, first variable',
        inputKinds: [satThreshold(steps(20, 60, 5))],
        makeInput: makeSatInput({ heuristic: 'first', propagate: true, pure: true }),
        expected: { threshold: 'expc' },
      }),
      sat({
        id: 'sat/dpll-moms',
        name: 'DPLL, MOMS',
        inputKinds: [satThreshold(steps(20, 80, 5))],
        makeInput: makeSatInput({ heuristic: 'moms', propagate: true, pure: true }),
        expected: { threshold: 'expc' },
      }),
      sat({
        id: 'sat/dpll-jw',
        name: 'DPLL, Jeroslow–Wang',
        inputKinds: [satThreshold(steps(20, 80, 5))],
        makeInput: makeSatInput({ heuristic: 'jw', propagate: true, pure: true }),
        expected: { threshold: 'expc' },
      }),
    ],
  },
  {
    id: 'reductions',
    title: 'NP-completeness',
    algorithms: [
      encoder<Graph, 'sparse'>({
        id: 'reductions/coloring',
        name: '3-colouring → SAT',
        generator: coloring.encode,
        inputKinds: [{ id: 'sparse', label: 'Random graphs with E = 2V', random: true, xLabel: 'vertices V' }],
        instance: (n, rng) => randomGraph(n, 2 * n, rng),
        maxBenchN: 2 ** 12,
        expected: 'n',
      }),
      encoder<CliqueInstance, 'half'>({
        id: 'reductions/clique',
        name: '3-clique → SAT',
        generator: clique.encode,
        inputKinds: [{ id: 'half', label: 'G(V, ½), k = 3', random: true, xLabel: 'vertices V' }],
        instance: (n, rng) => ({ g: gnp(n, 0.5, rng), k: 3 }),
        maxBenchN: 512,
        expected: 'n2',
      }),
      encoder<Graph, 'half'>({
        id: 'reductions/hamiltonian',
        name: 'Hamiltonian cycle → SAT',
        generator: hamiltonian.encode,
        inputKinds: [{ id: 'half', label: 'G(V, ½)', random: true, xLabel: 'vertices V', sizes: steps(8, 48, 8) }],
        instance: (n, rng) => gnp(n, 0.5, rng),
        maxBenchN: 64,
        expected: 'n3',
      }),
      encoder<Board, 'cells'>({
        id: 'reductions/sudoku',
        name: 'Sudoku → SAT',
        generator: sudoku.encode,
        inputKinds: [{ id: 'cells', label: 'Half-blank boards of N cells', random: true, xLabel: 'cells N', sizes: [16, 36, 64, 81, 100, 144, 225, 256] }],
        instance: (n, rng) => {
          const [r, c] = BOX_SHAPES[Math.round(Math.sqrt(n))]!;
          return blank(solvedBoard(r, c, rng), Math.floor(n / 2), rng);
        },
        maxBenchN: 256,
        // s⁴ clauses on s² cells: quadratic in the number of cells.
        expected: 'n2',
      }),
      encoder<Circuit, 'random'>({
        id: 'reductions/tseitin',
        name: 'Circuit → 3-SAT (Tseitin)',
        generator: tseitin.encode,
        inputKinds: [{ id: 'random', label: 'Random circuits of n gates', random: true, xLabel: 'gates n' }],
        instance: (n, rng) => randomCircuit(n, rng),
        maxBenchN: 2 ** 12,
        expected: 'n',
      }),
      encoder<MachineRun, 'steps'>({
        id: 'reductions/cook-levin',
        name: 'Machine run → SAT (Cook–Levin)',
        generator: cookLevin.encode,
        inputKinds: [{ id: 'steps', label: '4 input bits, T steps', random: true, xLabel: 'steps T' }],
        instance: (n, rng) => ({ input: Array.from({ length: 4 }, () => (rng() < 0.5 ? 0 : 1)), T: n }),
        maxBenchN: 2 ** 9,
        // A fixed-width tape: one row of window clauses per step.
        expected: 'n',
      }),
    ],
  },
];

export function findAlgorithm(id: string): AnyAlgorithmSpec {
  for (const m of MODULES) {
    const a = m.algorithms.find((x) => x.id === id);
    if (a) return a;
  }
  throw new Error(`unknown algorithm: ${id}`);
}
