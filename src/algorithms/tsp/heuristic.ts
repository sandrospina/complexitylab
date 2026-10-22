import type { Instrument } from '../../engine/instrument';
import type { Algorithm } from '../../engine/runner';
import { dist, tourCost } from './input';
import type { TspInput, TspResult, TspSnapshot } from './input';

/**
 * Nearest neighbour (always go to the closest unvisited city: n²/2 compares), then 2-opt:
 * reverse any stretch of the tour whose two end edges can be swapped for shorter ones,
 * repeating passes over all pairs until none helps. Fast, and usually a few percent off.
 */
export const tspHeuristic: Algorithm<TspInput, TspResult> = function* ({ pts }, ins: Instrument) {
  const n = pts.length;
  if (n === 0) return { cost: 0, tour: [] };
  const tour = Array<number>(n).fill(-1);
  const visited = Array<boolean>(n).fill(false);
  yield ins.alloc<TspSnapshot>(2 * n, { label: 'tour, visited' });
  tour[0] = 0;
  visited[0] = true;
  yield ins.write<TspSnapshot>({ indices: [0], value: 0, label: 'start at city 0' });
  for (let pos = 1; pos < n; pos++) {
    const from = tour[pos - 1]!;
    let next = -1;
    for (let c = 0; c < n; c++) {
      if (visited[c]) continue;
      yield ins.compare<TspSnapshot>({ label: `city ${c} nearer?` });
      if (next === -1 || dist(pts, from, c) < dist(pts, from, next)) next = c;
    }
    tour[pos] = next;
    visited[next] = true;
    yield ins.write<TspSnapshot>({ indices: [pos], value: next, label: 'nearest unvisited' });
  }
  yield ins.mark<TspSnapshot>('nearest-neighbour tour done', { snapshot: { best: tourCost(pts, tour) } });

  let improved = n >= 4;
  for (let pass = 1; improved; pass++) {
    improved = false;
    for (let i = 0; i < n - 2; i++) {
      for (let j = i + 2; j < n - (i === 0 ? 1 : 0); j++) {
        const [a, b, c, d] = [tour[i]!, tour[i + 1]!, tour[j]!, tour[(j + 1) % n]!];
        yield ins.compare<TspSnapshot>({ label: 'swap two edges?' });
        if (dist(pts, a, c) + dist(pts, b, d) < dist(pts, a, b) + dist(pts, c, d) - 1e-12) {
          for (let x = i + 1, y = j; x < y; x++, y--) {
            [tour[x], tour[y]] = [tour[y]!, tour[x]!];
            yield ins.swap<TspSnapshot>({ indices: [x, y], label: '2-opt reversal' });
          }
          improved = true;
        }
      }
    }
    yield ins.mark<TspSnapshot>(`2-opt pass ${pass} done`, { snapshot: { best: tourCost(pts, tour) } });
  }
  yield ins.free<TspSnapshot>(2 * n, { label: 'tour, visited' });
  return { cost: tourCost(pts, tour), tour };
};
