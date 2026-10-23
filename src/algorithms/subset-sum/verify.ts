import type { Instrument } from '../../engine/instrument';
import type { Algorithm } from '../../engine/runner';
import type { Certificate, SubsetSumSnapshot } from './input';

export interface VerifyResult {
  valid: boolean;
  reason?: 'index out of range' | 'index repeated' | 'wrong sum';
}

/** Checks a certificate in one pass: each index in range and unused, then the sum. Θ(n). */
export const verifySubsetSum: Algorithm<Certificate, VerifyResult> = function* ({ nums, target, cert }, ins: Instrument) {
  const used = Array<boolean>(nums.length).fill(false);
  yield ins.alloc<SubsetSumSnapshot>(nums.length, { label: 'used', line: 1 });
  let sum = 0;
  let result: VerifyResult | undefined;
  for (const i of cert) {
    ins.at(2);
    // Line 3 is two compares (in range? used?); it is counted once, on the first.
    yield ins.compare<SubsetSumSnapshot>({ indices: [i], label: 'in range?', snapshot: { sum }, line: 3 });
    if (!Number.isInteger(i) || i < 0 || i >= nums.length) {
      result = { valid: false, reason: 'index out of range' };
      break;
    }
    yield ins.compare<SubsetSumSnapshot>({ indices: [i], label: 'used already?', snapshot: { sum } });
    if (used[i]) {
      result = { valid: false, reason: 'index repeated' };
      break;
    }
    used[i] = true;
    sum += nums[i]!;
    yield ins.read<SubsetSumSnapshot>({ indices: [i], snapshot: { sum }, line: 4 });
  }
  if (!result) {
    // The loop test that ends the loop.
    ins.at(2);
    yield ins.compare<SubsetSumSnapshot>({ label: `${sum} = ${target}?`, snapshot: { sum }, line: 5 });
    result = sum === target ? { valid: true } : { valid: false, reason: 'wrong sum' };
  }
  yield ins.free<SubsetSumSnapshot>(nums.length, { label: 'used' });
  return result;
};
