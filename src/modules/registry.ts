// Pure TypeScript: imported by the benchmark worker, so no React or DOM here.
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
  makeInput: (n: number, kind: K, rng: Rng) => I;
  /** Largest n the animation accepts. */
  maxAnimN: number;
  /** Largest n the benchmark runs (a power of two); beyond it the scaling view extrapolates. */
  maxBenchN: number;
  /** Which count the scaling view plots; 'total' sums every counted op. */
  metric: OpKind | 'total';
  /** The textbook bound for each input kind; the registry test checks the instrumentation against it. */
  expected: Record<K, ComplexityClass>;
}

export interface InputKindSpec<K extends string = string> {
  id: K;
  label: string;
  random?: boolean;
}

export type AnyAlgorithmSpec = AlgorithmSpec<unknown, unknown>;

function define<I, R, K extends string>(spec: AlgorithmSpec<I, R, K>): AnyAlgorithmSpec {
  return spec as unknown as AnyAlgorithmSpec;
}

/** Benchmark sizes for a spec: powers of two from 16 up to its maxBenchN. */
export function benchSizes(spec: AnyAlgorithmSpec, from = 16): number[] {
  const sizes: number[] = [];
  for (let n = from; n <= spec.maxBenchN; n *= 2) sizes.push(n);
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
];

export function findAlgorithm(id: string): AnyAlgorithmSpec {
  for (const m of MODULES) {
    const a = m.algorithms.find((x) => x.id === id);
    if (a) return a;
  }
  throw new Error(`unknown algorithm: ${id}`);
}
