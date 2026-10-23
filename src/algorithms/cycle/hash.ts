import type { Algorithm } from '../../engine/runner';
import type { CycleInput, CycleResult, CycleSnapshot } from './input';

/**
 * Remember every value with its position until one comes round again. One pass of μ + λ
 * steps, but one cell per value seen: O(n) time and O(n) space.
 */
export const cycleHash: Algorithm<CycleInput, CycleResult> = function* ({ next, start }, ins) {
  const seen = new Map<number, number>();
  let x = start;
  for (let i = 0; ; i++) {
    yield ins.compare<CycleSnapshot>({ indices: [x], label: 'seen before?', snapshot: { at: x } });
    const first = seen.get(x);
    if (first !== undefined) {
      yield ins.mark<CycleSnapshot>(`repeat: first seen at step ${first}`, { indices: [x], snapshot: { at: x } });
      yield ins.free<CycleSnapshot>(seen.size, { label: 'seen set' });
      return { mu: first, lambda: i - first };
    }
    seen.set(x, i);
    yield ins.alloc<CycleSnapshot>(1, { indices: [x], label: 'remember', snapshot: { at: x } });
    yield ins.write<CycleSnapshot>({ indices: [x], value: i, snapshot: { at: x } });
    x = next[x]!;
    yield ins.read<CycleSnapshot>({ indices: [x], label: 'f(x)', snapshot: { at: x } });
  }
};
