/** Complexity classes the app can fit, predict and plot. */
export const COMPLEXITY_CLASSES = ['1', 'logn', 'n', 'nlogn', 'n2', 'n3', 'exp2', 'fact'] as const;

export type ComplexityClass = (typeof COMPLEXITY_CLASSES)[number];

export const CLASS_LABEL: Record<ComplexityClass, string> = {
  '1': 'O(1)',
  logn: 'O(log n)',
  n: 'O(n)',
  nlogn: 'O(n log n)',
  n2: 'O(n²)',
  n3: 'O(n³)',
  exp2: 'O(2ⁿ)',
  fact: 'O(n!)',
};

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
    case 'n3':
      return n * n * n;
    case 'exp2':
      return 2 ** n;
    case 'fact':
      return Math.exp(lnFactorial(n));
  }
}
