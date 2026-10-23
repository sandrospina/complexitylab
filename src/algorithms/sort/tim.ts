import type { Instrument } from '../../engine/instrument';
import type { Algorithm } from '../../engine/runner';
import type { SortInput, SortSnapshot } from './input';

/** Runs shorter than this are still merged one element at a time before galloping starts. */
const MIN_GALLOP = 7;

/** The minimum run length for n: between 32 and 64, so that n / minrun is close to a power of two. */
export function minRun(n: number): number {
  let r = 0;
  while (n >= 64) {
    r |= n & 1;
    n >>= 1;
  }
  return n + r;
}

interface Run {
  base: number;
  len: number;
}

/**
 * TimSort, after CPython's listsort. Find the natural runs (reversing strictly descending
 * ones), extend short runs to minrun with binary insertion sort, keep the runs on a stack
 * whose lengths grow like Fibonacci numbers (merging when that breaks), and merge with
 * galloping: when one side keeps winning, exponential search finds how far its lead goes.
 *
 * Every comparison, including those inside binary insertion and galloping, is a compare;
 * every move of an element into the array is an indexed write, so the bars replay it;
 * copies into the merge buffer are writes without an index.
 */
export const timSort: Algorithm<SortInput, number[]> = function* ({ arr }, ins) {
  const a = arr.slice();
  const n = a.length;
  const runs: Run[] = [];
  let minGallop = MIN_GALLOP;
  let span: SortSnapshot = { lo: 0, hi: n - 1 };

  /** a[k] = v, as an event the bars replay. */
  function* put(k: number, v: number) {
    a[k] = v;
    yield ins.write<SortSnapshot>({ indices: [k], value: v, snapshot: span });
  }
  function* less(x: number, y: number, indices?: number[], label?: string) {
    yield ins.compare<SortSnapshot>({ indices, label, snapshot: span });
    return x < y;
  }

  /** Length of the run starting at lo, reversed in place first if strictly descending. */
  function* countRun(lo: number): Generator<ReturnType<Instrument['mark']>, number> {
    if (lo + 1 >= n) return n - lo;
    let hi = lo + 2;
    if (yield* less(a[lo + 1]!, a[lo]!, [lo, lo + 1], 'run')) {
      while (hi < n && (yield* less(a[hi]!, a[hi - 1]!, [hi - 1, hi], 'run'))) hi++;
      for (let i = lo, j = hi - 1; i < j; i++, j--) {
        [a[i], a[j]] = [a[j]!, a[i]!];
        yield ins.swap<SortSnapshot>({ indices: [i, j], label: 'reverse run', snapshot: span });
      }
    } else {
      while (hi < n && !(yield* less(a[hi]!, a[hi - 1]!, [hi - 1, hi], 'run'))) hi++;
    }
    return hi - lo;
  }

  /** Sorts a[lo, hi) given that a[lo, start) is sorted: binary search, then shift right. */
  function* binaryInsertion(lo: number, hi: number, start: number) {
    for (; start < hi; start++) {
      const pivot = a[start]!;
      let l = lo;
      let r = start;
      while (l < r) {
        const p = (l + r) >> 1;
        if (yield* less(pivot, a[p]!, [p, start], 'binary insertion')) r = p;
        else l = p + 1;
      }
      for (let k = start; k > l; k--) yield* put(k, a[k - 1]!);
      if (l !== start) yield* put(l, pivot);
    }
  }

  /**
   * Where key goes among the n sorted values get(0..n−1), searching out from `hint`:
   * leftmost position (before equals) or rightmost (after equals).
   */
  function* gallop(key: number, get: (i: number) => number, len: number, hint: number, right: boolean) {
    const goesAfter = function* (x: number) {
      // Leftmost: skip x while x < key. Rightmost: skip x while x <= key, i.e. !(key < x).
      return right ? !(yield* less(key, x, undefined, 'gallop')) : yield* less(x, key, undefined, 'gallop');
    };
    let lastOfs = 0;
    let ofs = 1;
    if (yield* goesAfter(get(hint))) {
      const maxOfs = len - hint;
      while (ofs < maxOfs && (yield* goesAfter(get(hint + ofs)))) {
        lastOfs = ofs;
        ofs = 2 * ofs + 1;
      }
      ofs = Math.min(ofs, maxOfs);
      lastOfs += hint;
      ofs += hint;
    } else {
      const maxOfs = hint + 1;
      while (ofs < maxOfs && !(yield* goesAfter(get(hint - ofs)))) {
        lastOfs = ofs;
        ofs = 2 * ofs + 1;
      }
      ofs = Math.min(ofs, maxOfs);
      const k = lastOfs;
      lastOfs = hint - ofs;
      ofs = hint - k;
    }
    // Now the answer is in (lastOfs, ofs]: binary search it.
    lastOfs++;
    while (lastOfs < ofs) {
      const m = lastOfs + ((ofs - lastOfs) >> 1);
      if (yield* goesAfter(get(m))) lastOfs = m + 1;
      else ofs = m;
    }
    return ofs;
  }

  /** Merges a[pa, pa+na) and a[pb, pb+nb), na ≤ nb, copying the left run to a buffer. */
  function* mergeLo(pa: number, na: number, pb: number, nb: number) {
    const tmp = a.slice(pa, pa + na);
    yield ins.alloc<SortSnapshot>(na, { label: 'merge buffer', snapshot: span });
    for (let k = 0; k < na; k++) yield ins.write<SortSnapshot>({ label: 'copy to buffer', snapshot: span });
    let dest = pa;
    let i = 0;
    let j = pb;
    // The first element of B is known to be smaller than A's first (galloped past already).
    yield* put(dest++, a[j++]!);
    nb--;
    done: if (nb > 0 && na > 1) {
      for (;;) {
        let aWins = 0;
        let bWins = 0;
        // One element at a time until one side wins MIN_GALLOP times in a row.
        do {
          if (yield* less(a[j]!, tmp[i]!, [j], 'merge')) {
            yield* put(dest++, a[j++]!);
            bWins++;
            aWins = 0;
            if (--nb === 0) break done;
          } else {
            yield* put(dest++, tmp[i++]!);
            aWins++;
            bWins = 0;
            if (--na === 1) break done;
          }
        } while ((aWins | bWins) < minGallop);
        // Gallop while it pays.
        minGallop++;
        do {
          minGallop -= minGallop > 1 ? 1 : 0;
          aWins = yield* gallop(a[j]!, (k) => tmp[i + k]!, na, 0, true);
          for (let k = 0; k < aWins; k++) yield* put(dest++, tmp[i++]!);
          na -= aWins;
          if (na <= 1) break done;
          yield* put(dest++, a[j++]!);
          if (--nb === 0) break done;
          bWins = yield* gallop(tmp[i]!, (k) => a[j + k]!, nb, 0, false);
          for (let k = 0; k < bWins; k++) yield* put(dest++, a[j++]!);
          nb -= bWins;
          if (nb === 0) break done;
          yield* put(dest++, tmp[i++]!);
          if (--na === 1) break done;
        } while (aWins >= MIN_GALLOP || bWins >= MIN_GALLOP);
        minGallop++;
      }
    }
    if (na === 1 && nb > 0) {
      // The last element of A goes after the rest of B.
      for (let k = 0; k < nb; k++) yield* put(dest++, a[j++]!);
      yield* put(dest, tmp[i]!);
    } else {
      for (let k = 0; k < na; k++) yield* put(dest++, tmp[i++]!);
    }
    yield ins.free<SortSnapshot>(tmp.length, { label: 'merge buffer', snapshot: span });
  }

  /** Merges a[pa, pa+na) and a[pb, pb+nb), na > nb, from the right, buffering the right run. */
  function* mergeHi(pa: number, na: number, pb: number, nb: number) {
    const tmp = a.slice(pb, pb + nb);
    yield ins.alloc<SortSnapshot>(nb, { label: 'merge buffer', snapshot: span });
    for (let k = 0; k < nb; k++) yield ins.write<SortSnapshot>({ label: 'copy to buffer', snapshot: span });
    let dest = pb + nb - 1;
    let i = nb - 1;
    let j = pa + na - 1;
    // The last element of A is known to be larger than B's last.
    yield* put(dest--, a[j--]!);
    na--;
    done: if (na > 0 && nb > 1) {
      for (;;) {
        let aWins = 0;
        let bWins = 0;
        do {
          if (yield* less(tmp[i]!, a[j]!, [j], 'merge')) {
            yield* put(dest--, a[j--]!);
            aWins++;
            bWins = 0;
            if (--na === 0) break done;
          } else {
            yield* put(dest--, tmp[i--]!);
            bWins++;
            aWins = 0;
            if (--nb === 1) break done;
          }
        } while ((aWins | bWins) < minGallop);
        minGallop++;
        do {
          minGallop -= minGallop > 1 ? 1 : 0;
          aWins = na - (yield* gallop(tmp[i]!, (k) => a[pa + k]!, na, na - 1, true));
          for (let k = 0; k < aWins; k++) yield* put(dest--, a[j--]!);
          na -= aWins;
          if (na === 0) break done;
          yield* put(dest--, tmp[i--]!);
          if (--nb === 1) break done;
          bWins = nb - (yield* gallop(a[j]!, (k) => tmp[k]!, nb, nb - 1, false));
          for (let k = 0; k < bWins; k++) yield* put(dest--, tmp[i--]!);
          nb -= bWins;
          if (nb <= 1) break done;
          yield* put(dest--, a[j--]!);
          if (--na === 0) break done;
        } while (aWins >= MIN_GALLOP || bWins >= MIN_GALLOP);
        minGallop++;
      }
    }
    if (nb === 1 && na > 0) {
      // The first element of B goes before the rest of A.
      for (let k = 0; k < na; k++) yield* put(dest--, a[j--]!);
      yield* put(dest, tmp[i]!);
    } else {
      for (let k = 0; k < nb; k++) yield* put(dest--, tmp[i--]!);
    }
    yield ins.free<SortSnapshot>(tmp.length, { label: 'merge buffer', snapshot: span });
  }

  /** Merges stack runs i and i + 1, after galloping past the parts already in place. */
  function* mergeAt(i: number) {
    const A = runs[i]!;
    const B = runs[i + 1]!;
    runs[i] = { base: A.base, len: A.len + B.len };
    runs.splice(i + 1, 1);
    span = { lo: A.base, hi: B.base + B.len - 1 };
    yield ins.mark<SortSnapshot>(`merge runs of ${A.len} and ${B.len}`, { snapshot: span });
    // Elements of A not above B's first are already in place, as are those of B not below A's last.
    const k = yield* gallop(a[B.base]!, (x) => a[A.base + x]!, A.len, 0, true);
    const pa = A.base + k;
    const na = A.len - k;
    if (na === 0) return;
    const nb = yield* gallop(a[pa + na - 1]!, (x) => a[B.base + x]!, B.len, B.len - 1, false);
    if (nb === 0) return;
    if (na <= nb) yield* mergeLo(pa, na, B.base, nb);
    else yield* mergeHi(pa, na, B.base, nb);
  }

  /**
   * Restores the stack invariants (each run longer than the next two together, and than
   * the next), checking the top four runs: the 2015 fix for the bug de Gouw et al. found
   * by formally verifying TimSort, which the original top-three check missed.
   */
  function* mergeCollapse() {
    while (runs.length > 1) {
      let i = runs.length - 2;
      const len = (k: number) => runs[k]!.len;
      if ((i > 0 && len(i - 1) <= len(i) + len(i + 1)) || (i > 1 && len(i - 2) <= len(i - 1) + len(i))) {
        if (len(i - 1) < len(i + 1)) i--;
      } else if (len(i) > len(i + 1)) break;
      yield* mergeAt(i);
    }
  }

  if (n >= 2) {
    const mr = minRun(n);
    yield ins.alloc<SortSnapshot>(1, { label: 'run stack', snapshot: span });
    for (let lo = 0; lo < n; ) {
      span = { lo, hi: n - 1 };
      let len = yield* countRun(lo);
      if (len < mr) {
        const force = Math.min(n - lo, mr);
        span = { lo, hi: lo + force - 1 };
        yield* binaryInsertion(lo, lo + force, lo + len);
        len = force;
      }
      runs.push({ base: lo, len });
      yield ins.mark<SortSnapshot>(`run of ${len} at ${lo}`, { snapshot: { lo, hi: lo + len - 1 } });
      yield* mergeCollapse();
      lo += len;
    }
    while (runs.length > 1) {
      let i = runs.length - 2;
      if (i > 0 && runs[i - 1]!.len < runs[i + 1]!.len) i--;
      yield* mergeAt(i);
    }
    yield ins.free<SortSnapshot>(1, { label: 'run stack', snapshot: span });
  }
  return a;
};
