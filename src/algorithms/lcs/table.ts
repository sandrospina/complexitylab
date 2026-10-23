import type { Algorithm } from '../../engine/runner';
import type { LcsInput, LcsResult, LcsSnapshot } from './input';

/**
 * The full (n+1) × (m+1) table: L[i][j] is the LCS length of a[0, i) and b[0, j). Each cell
 * compares two letters and reads one or two neighbours. Keeping every cell lets a walk back
 * from the corner recover the subsequence. O(nm) time and O(nm) cells.
 */
export const lcsTable: Algorithm<LcsInput, LcsResult> = function* ({ a, b }, ins) {
  const n = a.length;
  const m = b.length;
  const L = Array.from({ length: n + 1 }, () => Array<number>(m + 1).fill(0));
  yield ins.alloc<LcsSnapshot>((n + 1) * (m + 1), { label: 'table' });
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) {
      yield ins.compare<LcsSnapshot>({ indices: [i, j], label: `${a[i - 1]} = ${b[j - 1]}?`, snapshot: { i, j } });
      if (a[i - 1] === b[j - 1]) {
        yield ins.read<LcsSnapshot>({ label: 'diagonal', snapshot: { i, j } });
        L[i]![j] = L[i - 1]![j - 1]! + 1;
      } else {
        yield ins.read<LcsSnapshot>({ label: 'up', snapshot: { i, j } });
        yield ins.read<LcsSnapshot>({ label: 'left', snapshot: { i, j } });
        L[i]![j] = Math.max(L[i - 1]![j]!, L[i]![j - 1]!);
      }
      yield ins.write<LcsSnapshot>({ indices: [i, j], value: L[i]![j], snapshot: { i, j } });
    }
  // Walk back from the corner: a diagonal step wherever the letters match.
  const out: string[] = [];
  for (let i = n, j = m; i > 0 && j > 0; ) {
    yield ins.mark<LcsSnapshot>('path', { indices: [i, j], snapshot: { i, j } });
    yield ins.compare<LcsSnapshot>({ indices: [i, j], label: 'trace back', snapshot: { i, j } });
    if (a[i - 1] === b[j - 1]) {
      out.push(a[i - 1]!);
      i--;
      j--;
    } else if (L[i - 1]![j]! >= L[i]![j - 1]!) i--;
    else j--;
  }
  yield ins.free<LcsSnapshot>((n + 1) * (m + 1), { label: 'table' });
  return { length: L[n]![m]!, lcs: out.reverse().join('') };
};
