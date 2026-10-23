import type { Instrument } from '../../engine/instrument';
import type { Algorithm } from '../../engine/runner';
import type { LcsInput, LcsResult, LcsSnapshot } from './input';

/**
 * Hirschberg: the subsequence in linear space. Split a in half; one two-row pass from the
 * top gives, for every split point k of b, the LCS of the top half with b[0, k); one pass
 * from the bottom gives that of the bottom half with b[k, m). The best k says where the
 * answer crosses the middle row, and each half is solved the same way. The passes cost
 * nm + nm/2 + nm/4 + … ≈ 2nm, in O(m) cells plus a recursion log n deep.
 */
export const lcsHirschberg: Algorithm<LcsInput, LcsResult> = function* ({ a, b }, ins) {
  /** Last row of the two-row pass of s against t (both given as index ranges), forwards or backwards. */
  function* lastRow(aLo: number, aHi: number, bLo: number, bHi: number, backwards: boolean, span: LcsSnapshot) {
    const m = bHi - bLo;
    let prev = Array<number>(m + 1).fill(0);
    let cur = Array<number>(m + 1).fill(0);
    yield ins.alloc<LcsSnapshot>(2 * (m + 1), { label: backwards ? 'rows from the bottom' : 'rows from the top', snapshot: span });
    for (let r = 0; r < aHi - aLo; r++) {
      const i = backwards ? aHi - 1 - r : aLo + r;
      for (let c = 1; c <= m; c++) {
        const j = backwards ? bHi - c : bLo + c - 1;
        yield ins.compare<LcsSnapshot>({ indices: [i + 1, j + 1], label: `${a[i]} = ${b[j]}?`, snapshot: { ...span, i: i + 1, j: j + 1 } });
        if (a[i] === b[j]) {
          yield ins.read<LcsSnapshot>({ label: 'diagonal', snapshot: span });
          cur[c] = prev[c - 1]! + 1;
        } else {
          yield ins.read<LcsSnapshot>({ label: 'up', snapshot: span });
          yield ins.read<LcsSnapshot>({ label: 'left', snapshot: span });
          cur[c] = Math.max(prev[c]!, cur[c - 1]!);
        }
        yield ins.write<LcsSnapshot>({ snapshot: span });
      }
      [prev, cur] = [cur, prev];
    }
    yield ins.free<LcsSnapshot>(2 * (m + 1), { snapshot: span });
    return prev;
  }

  function* solve(aLo: number, aHi: number, bLo: number, bHi: number): Generator<ReturnType<Instrument['mark']>, string> {
    const span: LcsSnapshot = { aLo, aHi, bLo, bHi };
    yield ins.pushFrame<LcsSnapshot>({ label: `a[${aLo}, ${aHi}) × b[${bLo}, ${bHi})`, value: aHi - aLo, snapshot: span });
    let out = '';
    if (aHi - aLo === 0 || bHi - bLo === 0) {
      // Nothing to match.
    } else if (aHi - aLo === 1) {
      // One letter: it is in the LCS if it appears anywhere in b's range.
      for (let j = bLo; j < bHi; j++) {
        yield ins.compare<LcsSnapshot>({ indices: [aLo + 1, j + 1], label: `${a[aLo]} = ${b[j]}?`, snapshot: { ...span, i: aLo + 1, j: j + 1 } });
        if (a[aLo] === b[j]) {
          out = a[aLo]!;
          yield ins.mark<LcsSnapshot>('match', { indices: [aLo, j], snapshot: span });
          break;
        }
      }
    } else {
      const mid = (aLo + aHi) >> 1;
      const top = yield* lastRow(aLo, mid, bLo, bHi, false, span);
      const bottom = yield* lastRow(mid, aHi, bLo, bHi, true, span);
      // Cross the middle row at the k that maximises top(k) + bottom(m − k).
      const m = bHi - bLo;
      let best = 0;
      let k = 0;
      for (let c = 0; c <= m; c++) {
        yield ins.compare<LcsSnapshot>({ label: 'best split', snapshot: span });
        if (top[c]! + bottom[m - c]! > best) [best, k] = [top[c]! + bottom[m - c]!, c];
      }
      yield ins.mark<LcsSnapshot>(`split b at ${bLo + k}`, { snapshot: span });
      out = (yield* solve(aLo, mid, bLo, bLo + k)) + (yield* solve(mid, aHi, bLo + k, bHi));
    }
    yield ins.popFrame();
    return out;
  }

  const lcs = yield* solve(0, a.length, 0, b.length);
  return { length: lcs.length, lcs };
};
