import type { Algorithm } from '../../engine/runner';
import type { SortInput, SortSnapshot } from './input';

interface Call {
  lo: number;
  hi: number;
  stage: 'enter' | 'left' | 'right';
}

/**
 * Top-down merge sort on half-open ranges. Recursion is simulated with an explicit stack of
 * calls (each marked by pushFrame/popFrame): nested generators would make every event pass
 * through log n frames. Merging copies the range into an aux buffer (alloc), then writes back
 * to the main array, one `write` event per element.
 */
export const mergeSort: Algorithm<SortInput, number[]> = function* ({ arr }, ins) {
  const a = arr.slice();
  const stack: Call[] = a.length > 0 ? [{ lo: 0, hi: a.length, stage: 'enter' }] : [];

  while (stack.length > 0) {
    const call = stack.at(-1)!;
    const { lo, hi } = call;
    const mid = (lo + hi) >>> 1;
    if (call.stage === 'enter') {
      yield ins.pushFrame<SortSnapshot>({ label: `[${lo}, ${hi})`, value: hi - lo, snapshot: { lo, hi: hi - 1 } });
      ins.at(1);
      if (hi - lo <= 1) {
        yield ins.popFrame();
        stack.pop();
      } else {
        ins.at(2);
        ins.at(3);
        call.stage = 'left';
        stack.push({ lo, hi: mid, stage: 'enter' });
      }
    } else if (call.stage === 'left') {
      ins.at(4);
      call.stage = 'right';
      stack.push({ lo: mid, hi, stage: 'enter' });
    } else {
      // Both halves are sorted: merge them.
      ins.at(5);
      const snapshot: SortSnapshot = { lo, hi: hi - 1 };
      yield ins.alloc(hi - lo, { label: 'aux', snapshot, line: 6 });
      const aux = a.slice(lo, hi);
      const m = mid - lo;
      let i = 0;
      let j = m;
      ins.at(7);
      for (let k = lo; ; k++) {
        ins.at(8);
        if (k >= hi) break;
        let v: number;
        if (i < m && j < aux.length) {
          // The branch taken is known before the event, so the compare is counted on its line.
          const left = aux[i]! <= aux[j]!;
          yield ins.compare({ indices: [lo + i, lo + j], snapshot, line: left ? 11 : 12 });
          v = left ? aux[i++]! : aux[j++]!;
        } else {
          ins.at(i < m ? 10 : 9);
          v = i < m ? aux[i++]! : aux[j++]!;
        }
        a[k] = v;
        yield ins.write({ indices: [k], value: v, snapshot });
      }
      yield ins.free(hi - lo, { snapshot });
      yield ins.popFrame();
      stack.pop();
    }
  }
  return a;
};
