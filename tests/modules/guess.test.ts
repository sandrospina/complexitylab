import { describe, expect, it } from 'vitest';
import { binaryGuesses, optimalGuesses } from '../../src/modules/search/guess';

describe('guess my number', () => {
  it('binary search always finds the secret within the optimal bound', () => {
    for (const max of [1, 2, 10, 100, 1000]) {
      for (let s = 1; s <= max; s++) {
        const g = binaryGuesses(max, s);
        expect(g.at(-1)).toBe(s);
        expect(g.length).toBeLessThanOrEqual(optimalGuesses(max));
      }
    }
  });
});
