import type { Instrument } from '../../engine/instrument';
import type { Algorithm } from '../../engine/runner';
import type { KnapsackInput, KnapsackResult, KnapsackSnapshot } from './input';

/**
 * Tries all 2ⁿ subsets in Gray-code order, so each step adds or removes exactly one item:
 * a read of the item, a write of its bit, and two compares (fits? better?). Θ(2ⁿ), and
 * the size of W does not matter at all.
 */
export const knapsackBrute: Algorithm<KnapsackInput, KnapsackResult> = function* ({ w, v, W }, ins: Instrument) {
  const n = w.length;
  const chosen = Array<boolean>(n).fill(false);
  yield ins.alloc<KnapsackSnapshot>(2 * n, { label: 'subset, best subset' });
  let weight = 0;
  let value = 0;
  let best = 0;
  let bestSet: boolean[] = chosen.slice();
  for (let k = 1; k < 2 ** n; k++) {
    // The Gray code of k differs from k − 1's in its lowest set bit.
    const i = Math.log2(k & -k);
    yield ins.read<KnapsackSnapshot>({ indices: [i], snapshot: { weight, value, best } });
    chosen[i] = !chosen[i];
    weight += chosen[i] ? w[i]! : -w[i]!;
    value += chosen[i] ? v[i]! : -v[i]!;
    yield ins.write<KnapsackSnapshot>({ indices: [i], value: chosen[i] ? 1 : 0, snapshot: { weight, value, best } });
    yield ins.compare<KnapsackSnapshot>({ label: `${weight} ≤ ${W}?`, snapshot: { weight, value, best } });
    const fits = weight <= W;
    yield ins.compare<KnapsackSnapshot>({ label: 'better?', snapshot: { weight, value, best } });
    if (fits && value > best) {
      best = value;
      bestSet = chosen.slice();
      yield ins.mark<KnapsackSnapshot>('new best', { snapshot: { weight, value, best } });
    }
  }
  yield ins.free<KnapsackSnapshot>(2 * n, { label: 'subset, best subset' });
  return { best, items: bestSet.flatMap((b, i) => (b ? [i] : [])) };
};
