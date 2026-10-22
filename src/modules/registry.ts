// Pure TypeScript: imported by the benchmark worker, so no React or DOM here.
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
import { makeSearchInput, SEARCH_INPUT_KINDS } from '../algorithms/search/input';
import type { SearchInput, SearchInputKind } from '../algorithms/search/input';
import { linearSearch } from '../algorithms/search/linear';
import { makeSortInput, SORT_INPUT_KINDS } from '../algorithms/sort/input';
import type { SortInput, SortInputKind } from '../algorithms/sort/input';
import { insertionSort } from '../algorithms/sort/insertion';
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
import { makeCheckInput, makeSolveInput } from '../algorithms/sudoku/board';
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
  /** 'median' of `trials` runs per n, for random kinds whose cost is heavy-tailed. */
  aggregate?: 'mean' | 'median';
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

const search = (s: Omit<AlgorithmSpec<SearchInput, number, SearchInputKind>, 'inputKinds' | 'makeInput' | 'maxAnimN' | 'maxBenchN' | 'metric'>) =>
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

export const MODULES: ModuleSpec[] = [
  {
    id: 'search',
    title: 'Search',
    algorithms: [
      search({ id: 'search/linear', name: 'Linear search', generator: linearSearch, expected: { worst: 'n', random: 'n' } }),
      search({ id: 'search/binary', name: 'Binary search', generator: binarySearch, expected: { worst: 'logn', random: 'logn' } }),
      search({
        id: 'search/binary-recursive',
        name: 'Binary search (recursive)',
        generator: binarySearchRecursive,
        expected: { worst: 'logn', random: 'logn' },
      }),
    ],
  },
  {
    id: 'sorting',
    title: 'Sorting',
    algorithms: [
      sort({
        id: 'sorting/insertion',
        name: 'Insertion sort',
        generator: insertionSort,
        maxBenchN: 2 ** 12,
        expected: { random: 'n2', sorted: 'n', reversed: 'n2', fewUnique: 'n2' },
      }),
      sort({
        id: 'sorting/merge',
        name: 'Merge sort',
        generator: mergeSort,
        maxBenchN: 2 ** 16,
        expected: { random: 'nlogn', sorted: 'nlogn', reversed: 'nlogn', fewUnique: 'nlogn' },
      }),
      sort({
        id: 'sorting/quick-naive',
        name: 'Quicksort (last pivot)',
        generator: quickNaive,
        maxBenchN: 2 ** 12,
        expected: { random: 'nlogn', sorted: 'n2', reversed: 'n2', fewUnique: 'n2' },
      }),
      sort({
        id: 'sorting/quick-random',
        name: 'Quicksort (random pivot)',
        generator: quickRandom,
        maxBenchN: 2 ** 12,
        // Lomuto puts every copy of the pivot on one side, so duplicates defeat random pivots.
        expected: { random: 'nlogn', sorted: 'nlogn', reversed: 'nlogn', fewUnique: 'n2' },
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
];

export function findAlgorithm(id: string): AnyAlgorithmSpec {
  for (const m of MODULES) {
    const a = m.algorithms.find((x) => x.id === id);
    if (a) return a;
  }
  throw new Error(`unknown algorithm: ${id}`);
}
