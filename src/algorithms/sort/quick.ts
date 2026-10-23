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
        ins.at(1);
        if (hi <= lo) {
          stack.pop();
          continue;
        }
        yield ins.pushFrame<SortSnapshot>({ label: `[${lo}, ${hi}]`, value: hi - lo + 1, snapshot: { lo, hi } });
        // A line whose swap is skipped (swapping an element with itself) still runs: count it with at().
        if (randomPivot) {
          const r = randInt(rng, lo, hi + 1);
          if (r !== hi) {
            [a[r], a[hi]] = [a[hi]!, a[r]!];
            yield ins.swap<SortSnapshot>({ indices: [r, hi], label: 'random pivot', snapshot: { lo, hi, pivot: hi }, line: 2 });
          } else ins.at(2);
        }
        ins.at(3);
        const pivot = a[hi]!;
        ins.at(6);
        let i = lo;
        ins.at(7);
        for (let j = lo; ; j++) {
          ins.at(8);
          if (j >= hi) break;
          yield ins.compare<SortSnapshot>({ indices: [j, hi], snapshot: { lo, hi, pivot: hi }, line: 9 });
          if (a[j]! < pivot) {
            if (i !== j) {
              [a[i], a[j]] = [a[j]!, a[i]!];
              yield ins.swap<SortSnapshot>({ indices: [i, j], snapshot: { lo, hi, pivot: hi }, line: 10 });
            } else ins.at(10);
            ins.at(11);
            i++;
          }
        }
        if (i !== hi) {
          [a[i], a[hi]] = [a[hi]!, a[i]!];
          yield ins.swap<SortSnapshot>({ indices: [i, hi], label: 'place pivot', snapshot: { lo, hi, pivot: i }, line: 12 });
        } else ins.at(12);
        ins.at(13);
        call.p = i;
        call.stage = 'left';
        ins.at(4);
        stack.push({ lo, hi: i - 1, stage: 'enter' });
      } else if (call.stage === 'left') {
        ins.at(5);
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
