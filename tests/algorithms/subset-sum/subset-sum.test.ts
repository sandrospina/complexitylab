import { describe, expect, it } from 'vitest';
import { subsetSumBrute } from '../../../src/algorithms/subset-sum/brute';
import { makeSolveInput, makeVerifyInput } from '../../../src/algorithms/subset-sum/input';
import { verifySubsetSum } from '../../../src/algorithms/subset-sum/verify';
import { mulberry32 } from '../../../src/engine/rng';
import { runCount } from '../../../src/engine/runner';

const verify = (nums: number[], target: number, cert: number[]) => runCount(verifySubsetSum, { nums, target, cert }).result!;

describe('subset sum', () => {
  it('brute force finds a subset when one exists, and its answer verifies', () => {
    const nums = [3, 34, 4, 12, 5, 2];
    for (const target of [0, 9, 14, 50, 60]) {
      const found = runCount(subsetSumBrute, { nums, target }).result;
      expect(found).toBeDefined();
      expect(verify(nums, target, found!)).toEqual({ valid: true });
    }
    for (const target of [13, 61]) expect(runCount(subsetSumBrute, { nums, target }).result).toBeUndefined();
  });

  it('an odd target over even numbers tries all 2ⁿ subsets', () => {
    const input = makeSolveInput(10, 'none', mulberry32(1));
    const r = runCount(subsetSumBrute, input);
    expect(r.result).toBeUndefined();
    expect(r.counters.totalOps).toBe(1 + 3 * (2 ** 10 - 1));
  });

  it('the verifier accepts valid certificates and rejects mutated ones', () => {
    const { nums, target, cert } = makeVerifyInput(12, 'valid', mulberry32(4));
    expect(verify(nums, target, cert)).toEqual({ valid: true });
    expect(verify(nums, target + 2, cert)).toEqual({ valid: false, reason: 'wrong sum' });
    expect(verify(nums, target, [...cert, cert[0]!])).toEqual({ valid: false, reason: 'index repeated' });
    expect(verify(nums, target, [...cert, 12])).toEqual({ valid: false, reason: 'index out of range' });
    expect(verify(nums, target, cert.slice(1)).valid).toBe(false);
  });

  it('verifying costs 3 ops per index plus the final compare', () => {
    const { nums, target, cert } = makeVerifyInput(20, 'valid', mulberry32(2));
    expect(runCount(verifySubsetSum, { nums, target, cert }).counters.totalOps).toBe(3 * cert.length + 1);
  });
});
