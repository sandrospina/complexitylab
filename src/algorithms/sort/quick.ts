import type { Instrument } from '../../engine/instrument';
import { mulberry32, randInt } from '../../engine/rng';
import type { Rng } from '../../engine/rng';
import type { Algorithm } from '../../engine/runner';
import type { SortInput, SortSnapshot } from './input';

interface Call {
  lo: number;
  hi: number;
  stage: 'enter' | 'left' | 'right';
  p?: number;
}

/**
 * Quicksort with Lomuto partitioning. Recursion is simulated with an explicit stack of
 * calls (each marked by pushFrame/popFrame) because sorted input recurses n deep, and n
 * nested generators would make every step cost O(depth).
 */
function quicksort(randomPivot: boolean): Algorithm<SortInput, number[]> {
  return function* ({ arr, seed }, ins: Instrument) {
    const a = arr.slice();
    const rng: Rng = mulberry32(seed);
    const stack: Call[] = [{ lo: 0, hi: a.length - 1, stage: 'enter' }];

    while (stack.length > 0) {
      const call = stack.at(-1)!;
      const { lo, hi } = call;
      if (call.stage === 'enter') {
        if (hi <= lo) {
          stack.pop();
          continue;
        }
        yield ins.pushFrame<SortSnapshot>({ label: `[${lo}, ${hi}]`, value: hi - lo + 1, snapshot: { lo, hi } });
        if (randomPivot) {
          const r = randInt(rng, lo, hi + 1);
          if (r !== hi) {
            [a[r], a[hi]] = [a[hi]!, a[r]!];
            yield ins.swap<SortSnapshot>({ indices: [r, hi], label: 'random pivot', snapshot: { lo, hi, pivot: hi } });
          }
        }
        const pivot = a[hi]!;
        let i = lo;
        for (let j = lo; j < hi; j++) {
          yield ins.compare<SortSnapshot>({ indices: [j, hi], snapshot: { lo, hi, pivot: hi } });
          if (a[j]! < pivot) {
            if (i !== j) {
              [a[i], a[j]] = [a[j]!, a[i]!];
              yield ins.swap<SortSnapshot>({ indices: [i, j], snapshot: { lo, hi, pivot: hi } });
            }
            i++;
          }
        }
        if (i !== hi) {
          [a[i], a[hi]] = [a[hi]!, a[i]!];
          yield ins.swap<SortSnapshot>({ indices: [i, hi], label: 'place pivot', snapshot: { lo, hi, pivot: i } });
        }
        call.p = i;
        call.stage = 'left';
        stack.push({ lo, hi: i - 1, stage: 'enter' });
      } else if (call.stage === 'left') {
        call.stage = 'right';
        stack.push({ lo: call.p! + 1, hi, stage: 'enter' });
      } else {
        yield ins.popFrame();
        stack.pop();
      }
    }
    return a;
  };
}

/** Last element as pivot: n(n−1)/2 compares on sorted input. */
export const quickNaive = quicksort(false);
/** Uniformly random pivot: expected ~1.39 n log₂ n compares on any input of distinct values. */
export const quickRandom = quicksort(true);
