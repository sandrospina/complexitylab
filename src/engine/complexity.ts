/** Complexity classes the app can fit, predict and plot, slowest-growing first. */
export const COMPLEXITY_CLASSES = ['1', 'loglogn', 'logn', 'sqrtn', 'n', 'nlogn', 'n2', 'n2logn', 'n3', 'expc', 'expPhi', 'exp2', 'n2exp2', 'fact'] as const;

export type ComplexityClass = (typeof COMPLEXITY_CLASSES)[number];

/** Classes with a fixed growth function. `expc` (cⁿ) needs a base fitted to the data. */
export const FIXED_CLASSES = COMPLEXITY_CLASSES.filter((c) => c !== 'expc');
export type FixedClass = Exclude<ComplexityClass, 'expc'>;

export const CLASS_LABEL: Record<ComplexityClass, string> = {
  '1': 'O(1)',
  loglogn: 'O(log log n)',
  logn: 'O(log n)',
  sqrtn: 'O(√n)',
  n: 'O(n)',
  nlogn: 'O(n log n)',
  n2: 'O(n²)',
  n2logn: 'O(n² log n)',
  n3: 'O(n³)',
  expc: 'O(cⁿ)',
  expPhi: 'O(φⁿ)',
  exp2: 'O(2ⁿ)',
  n2exp2: 'O(n²·2ⁿ)',
  fact: 'O(n!)',
};

/** The golden ratio, (1 + √5) / 2: naive Fibonacci makes Θ(φⁿ) calls. */
export const PHI = (1 + Math.sqrt(5)) / 2;

export function lnFactorial(n: number): number {
  if (n < 2) return 0;
  if (n < 256) {
    let s = 0;
    for (let k = 2; k <= n; k++) s += Math.log(k);
    return s;
  }
  // Stirling with the first correction term; accurate to ~1e-10 relative at n ≥ 256.
  return n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n) + 1 / (12 * n);
}

/** The growth function of each class; `base` is c for `expc`. May return Infinity for large n. */
export function growth(cls: ComplexityClass, n: number, base = 2): number {
  switch (cls) {
    case '1':
      return 1;
    case 'loglogn':
      // log₂ log₂ n, floored at n = 4 where it is 1, so small n stay positive.
      return Math.log2(Math.log2(Math.max(n, 4)));
    case 'logn':
      return Math.log2(n);
    case 'sqrtn':
      return Math.sqrt(n);
    case 'n':
      return n;
    case 'nlogn':
      return n * Math.log2(n);
    case 'n2':
      return n * n;
    case 'n2logn':
      return n * n * Math.log2(n);
    case 'n3':
      return n * n * n;
    case 'expc':
      return base ** n;
    case 'expPhi':
      return PHI ** n;
    case 'exp2':
      return 2 ** n;
    case 'n2exp2':
      return n * n * 2 ** n;
    case 'fact':
      return Math.exp(lnFactorial(n));
  }
}
