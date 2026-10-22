import type { Instrument } from '../../engine/instrument';
import type { Algorithm } from '../../engine/runner';
import type { SubsetSumInput, SubsetSumSnapshot } from './input';

/**
 * Tries subsets in Gray-code order, one number added or removed per step, until one sums
 * to the target. Θ(2ⁿ) when there is none. Returns the subset's indices, or undefined.
 */
export const subsetSumBrute: Algorithm<SubsetSumInput, number[] | undefined> = function* ({ nums, target }, ins: Instrument) {
  const n = nums.length;
  const chosen = Array<boolean>(n).fill(false);
  yield ins.alloc<SubsetSumSnapshot>(n, { label: 'subset' });
  let sum = 0;
  let found = target === 0;
  yield ins.compare<SubsetSumSnapshot>({ label: `0 = ${target}?`, snapshot: { sum } });
  for (let k = 1; k < 2 ** n && !found; k++) {
    const i = Math.log2(k & -k);
    yield ins.read<SubsetSumSnapshot>({ indices: [i], snapshot: { sum } });
    chosen[i] = !chosen[i];
    sum += chosen[i] ? nums[i]! : -nums[i]!;
    yield ins.write<SubsetSumSnapshot>({ indices: [i], value: chosen[i] ? 1 : 0, snapshot: { sum } });
    yield ins.compare<SubsetSumSnapshot>({ label: `${sum} = ${target}?`, snapshot: { sum } });
    found = sum === target;
  }
  yield ins.free<SubsetSumSnapshot>(n, { label: 'subset' });
  return found ? chosen.flatMap((b, i) => (b ? [i] : [])) : undefined;
};
