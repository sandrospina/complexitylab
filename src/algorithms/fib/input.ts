export interface FibInput {
  n: number;
}

/** Fibonacci has one input per n, so a single kind. */
export type FibInputKind = 'n';

export const FIB_INPUT_KINDS: { id: FibInputKind; label: string; random?: boolean }[] = [
  { id: 'n', label: 'fib(n)' },
];

export const makeFibInput = (n: number): FibInput => ({ n });

/** The call being worked on; memo-table writes carry `indices: [k]` and the value as a string. */
export interface FibSnapshot {
  k?: number;
}
