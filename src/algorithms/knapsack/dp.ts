import type { Instrument } from '../../engine/instrument';
import type { Algorithm } from '../../engine/runner';
import type { KnapsackInput, KnapsackResult, KnapsackSnapshot } from './input';

/**
 * The (n+1) × (W+1) table: best[i][c] is the best value using the first i items within
 * capacity c. Each cell costs a read, a compare and a write (plus a read when item i fits),
 * so Θ(n·W) time and cells: polynomial in n, but W doubles with every bit added to it.
 */
export const knapsackDp: Algorithm<KnapsackInput, KnapsackResult> = function* ({ w, v, W }, ins: Instrument) {
  const n = w.length;
  const cols = W + 1;
  const best = new Float64Array((n + 1) * cols);
  yield ins.alloc<KnapsackSnapshot>((n + 1) * cols, { label: 'table' });
  for (let i = 1; i <= n; i++) {
    const wi = w[i - 1]!;
    const vi = v[i - 1]!;
    for (let c = 0; c <= W; c++) {
      const skip = best[(i - 1) * cols + c]!;
      yield ins.read<KnapsackSnapshot>({ label: 'skip item', snapshot: { i, c } });
      let take = -1;
      if (wi <= c) {
        take = best[(i - 1) * cols + c - wi]! + vi;
        yield ins.read<KnapsackSnapshot>({ label: 'take item', snapshot: { i, c } });
      }
      yield ins.compare<KnapsackSnapshot>({ label: 'take or skip?', snapshot: { i, c } });
      best[i * cols + c] = Math.max(skip, take);
      yield ins.write<KnapsackSnapshot>({ indices: [i, c], value: best[i * cols + c], snapshot: { i, c } });
    }
  }
  // Walk back up the table: an item was taken wherever the value changed.
  const items: number[] = [];
  for (let i = n, c = W; i > 0; i--) {
    yield ins.compare<KnapsackSnapshot>({ label: 'taken?', snapshot: { i, c } });
    if (best[i * cols + c] !== best[(i - 1) * cols + c]) {
      items.push(i - 1);
      c -= w[i - 1]!;
    }
  }
  yield ins.free<KnapsackSnapshot>((n + 1) * cols, { label: 'table' });
  return { best: best[n * cols + W]!, items: items.reverse() };
};
