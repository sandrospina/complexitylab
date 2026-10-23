import type { Instrument } from '../../engine/instrument';
import type { Algorithm } from '../../engine/runner';
import { dist } from './input';
import type { TspInput, TspResult, TspSnapshot } from './input';

/**
 * Held–Karp dynamic programming: best[S][j] is the shortest path from city 0 through the
 * set S of other cities, ending at j ∈ S. Each of the 2ⁿ⁻¹ sets extends each of its end
 * cities by each city outside it: Θ(n²·2ⁿ) time, Θ(n·2ⁿ) cells. Exact, unlike the heuristic.
 */
export const tspHeldKarp: Algorithm<TspInput, TspResult> = function* ({ pts }, ins: Instrument) {
  const n = pts.length;
  if (n < 3) return { cost: n === 2 ? 2 * dist(pts, 0, 1) : 0, tour: Array.from({ length: n }, (_, i) => i) };
  const m = n - 1;
  const size = 2 ** m * m;
  const best = new Float64Array(size).fill(Infinity);
  const from = new Int8Array(size).fill(-1);
  yield ins.alloc<TspSnapshot>(2 * size, { label: 'path table, predecessors' });
  // Bit j stands for city j + 1.
  for (let j = 0; j < m; j++) {
    best[(1 << j) * m + j] = dist(pts, 0, j + 1);
    yield ins.write<TspSnapshot>({ label: 'path 0 → one city', snapshot: { mask: 1 << j, last: j + 1 }, line: 1 });
  }
  for (let mask = 1; mask < 1 << m; mask++) {
    ins.at(2);
    for (let j = 0; j < m; j++) {
      if (!(mask & (1 << j))) continue;
      const here = best[mask * m + j]!;
      yield ins.read<TspSnapshot>({ label: 'path so far', snapshot: { mask, last: j + 1 }, line: 3 });
      for (let k = 0; k < m; k++) {
        if (mask & (1 << k)) continue;
        const next = (mask | (1 << k)) * m + k;
        const d = here + dist(pts, j + 1, k + 1);
        yield ins.compare<TspSnapshot>({ label: `extend to ${k + 1}?`, snapshot: { mask, last: j + 1 }, line: 4 });
        if (d < best[next]!) {
          best[next] = d;
          from[next] = j;
          yield ins.write<TspSnapshot>({ label: 'shorter path', snapshot: { mask, last: j + 1 } });
        }
      }
    }
  }
  const full = (1 << m) - 1;
  let cost = Infinity;
  let last = 0;
  for (let j = 0; j < m; j++) {
    const d = best[full * m + j]! + dist(pts, j + 1, 0);
    yield ins.compare<TspSnapshot>({ label: 'close the tour', snapshot: { mask: full, last: j + 1 }, line: 5 });
    if (d < cost) [cost, last] = [d, j];
  }
  // Follow the predecessors back from the last city.
  ins.at(6);
  const rev: number[] = [];
  for (let mask = full, j = last; j >= 0; ) {
    rev.push(j + 1);
    const p = from[mask * m + j]!;
    mask &= ~(1 << j);
    j = p;
  }
  yield ins.free<TspSnapshot>(2 * size, { label: 'path table, predecessors' });
  return { cost, tour: [0, ...rev.reverse()] };
};
