/** Complexity classes the app can fit, predict and plot, slowest-growing first. */
export const COMPLEXITY_CLASSES = ['1', 'logn', 'n', 'nlogn', 'n2', 'n2logn', 'n3', 'expPhi', 'exp2', 'fact'] as const;

export type ComplexityClass = (typeof COMPLEXITY_CLASSES)[number];

export const CLASS_LABEL: Record<ComplexityClass, string> = {
  '1': 'O(1)',
  logn: 'O(log n)',
  n: 'O(n)',
  nlogn: 'O(n log n)',
  n2: 'O(n²)',
  n2logn: 'O(n² log n)',
  n3: 'O(n³)',
  expPhi: 'O(φⁿ)',
  exp2: 'O(2ⁿ)',
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

/** The growth function of each class. May return Infinity for large n. */
export function growth(cls: ComplexityClass, n: number): number {
  switch (cls) {
    case '1':
      return 1;
    case 'logn':
      return Math.log2(n);
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
    case 'expPhi':
      return PHI ** n;
    case 'exp2':
      return 2 ** n;
    case 'fact':
      return Math.exp(lnFactorial(n));
  }
}
