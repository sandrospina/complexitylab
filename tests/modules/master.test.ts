import { describe, expect, it } from 'vitest';
import { masterTheorem, recurrenceTex } from '../../src/modules/sorting/master';

describe('master theorem', () => {
  it('merge sort is case 2: n log n', () => {
    expect(masterTheorem({ a: 2, b: 2, k: 1 })).toMatchObject({ case: 2, critical: 1, bound: '\\Theta(n \\log n)' });
  });

  it('binary search is case 2: log n', () => {
    expect(masterTheorem({ a: 1, b: 2, k: 0 })).toMatchObject({ case: 2, critical: 0, bound: '\\Theta(\\log n)' });
  });

  it('leaf-heavy recurrences are case 1', () => {
    expect(masterTheorem({ a: 8, b: 2, k: 2 })).toMatchObject({ case: 1, bound: '\\Theta(n^{3})' });
    expect(masterTheorem({ a: 3, b: 2, k: 1 })).toMatchObject({ case: 1, bound: '\\Theta(n^{1.58})' });
  });

  it('root-heavy recurrences are case 3', () => {
    expect(masterTheorem({ a: 2, b: 2, k: 2 })).toMatchObject({ case: 3, bound: '\\Theta(n^{2})' });
  });

  it('formats recurrences', () => {
    expect(recurrenceTex({ a: 2, b: 2, k: 1 })).toBe('T(n) = 2\\,T(n/2) + \\Theta(n)');
    expect(recurrenceTex({ a: 1, b: 2, k: 0 })).toBe('T(n) = T(n/2) + \\Theta(1)');
  });
});
