// Pure TypeScript: imported by the benchmark worker, so no React or DOM here.
import { binarySearch } from '../algorithms/search/binary';
import { makeSearchInput, SEARCH_INPUT_KINDS } from '../algorithms/search/input';
import type { SearchInputKind } from '../algorithms/search/input';
import { linearSearch } from '../algorithms/search/linear';
import type { ComplexityClass } from '../engine/complexity';
import type { Rng } from '../engine/rng';
import type { Algorithm } from '../engine/runner';

export interface AlgorithmSpec<I, R, K extends string = string> {
  /** Globally unique, "<module>/<algorithm>". */
  id: string;
  name: string;
  generator: Algorithm<I, R>;
  inputKinds: { id: K; label: string }[];
  makeInput: (n: number, kind: K, rng: Rng) => I;
  /** Largest n the animation accepts. */
  maxAnimN: number;
  /** Largest n the benchmark runs; beyond it the scaling view extrapolates. */
  maxBenchN: number;
  /** The textbook bound, used to check the instrumentation and score predictions. */
  expectedClass: ComplexityClass;
}

export type AnyAlgorithmSpec = AlgorithmSpec<unknown, unknown>;

function define<I, R, K extends string>(spec: AlgorithmSpec<I, R, K>): AnyAlgorithmSpec {
  return spec as unknown as AnyAlgorithmSpec;
}

export interface ModuleSpec {
  id: string;
  title: string;
  algorithms: AnyAlgorithmSpec[];
}

export const MODULES: ModuleSpec[] = [
  {
    id: 'search',
    title: 'Search',
    algorithms: [
      define<ReturnType<typeof makeSearchInput>, number, SearchInputKind>({
        id: 'search/linear',
        name: 'Linear search',
        generator: linearSearch,
        inputKinds: SEARCH_INPUT_KINDS,
        makeInput: makeSearchInput,
        maxAnimN: 64,
        maxBenchN: 2 ** 20,
        expectedClass: 'n',
      }),
      define<ReturnType<typeof makeSearchInput>, number, SearchInputKind>({
        id: 'search/binary',
        name: 'Binary search',
        generator: binarySearch,
        inputKinds: SEARCH_INPUT_KINDS,
        makeInput: makeSearchInput,
        maxAnimN: 64,
        maxBenchN: 2 ** 20,
        expectedClass: 'logn',
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
