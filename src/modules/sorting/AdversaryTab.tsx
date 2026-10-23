import { useState } from 'react';
import { runCount } from '../../engine/runner';
import { ADV_MAX_N, ADV_MIN_N, shuffled, SORT_ALGOS, useSortingStore } from '../../store/sorting';
import type { SortAlgo } from '../../store/sorting';
import { SORT_META } from './meta';

const RANDOM_PIVOT_RUNS = 20;

/** Compares the algorithm makes on `arr`. Random-pivot quicksort is averaged over many pivot sequences. */
export function adversaryScore(algo: SortAlgo, arr: number[]): number {
  const gen = SORT_META[algo].generator;
  if (algo !== 'quick-random') return runCount(gen, { arr, seed: 0 }).counters.ops.compare;
  let total = 0;
  for (let seed = 1; seed <= RANDOM_PIVOT_RUNS; seed++) total += runCount(gen, { arr, seed }).counters.ops.compare;
  return Math.round((total / RANDOM_PIVOT_RUNS) * 10) / 10;
}

const NOTES: Record<SortAlgo, string> = {
  bubble: 'Large values race to the right, a whole pass at a time. Small values crawl left one place per pass. Where should the smallest value start?',
  insertion: 'Every element has to travel past all the smaller ones on its left. Which order makes every trip as long as possible?',
  tim: 'TimSort looks for runs that are already sorted (or strictly descending) and merges them, galloping when one side keeps winning. Sorted input is one run. What gives it the least to work with?',
  merge: 'Merge sort always splits in half, so no input can push it past n log₂ n − n + 1 compares. Try anyway.',
  'quick-naive': 'The last element is always the pivot. What happens when the pivot is the largest value in its range, every time?',
  'quick-random':
    'The pivot is chosen at random on every run, and this score is the average over 20 runs. An input that is bad for one run is fine for the next: randomness takes the adversary out of the game.',
};

/** The student rearranges the input to force as many comparisons as possible. */
export function AdversaryTab() {
  const { advAlgo: algo, advArr: arr, advBest } = useSortingStore();
  const setAdversary = useSortingStore((s) => s.setAdversary);
  const [selected, setSelected] = useState<number | null>(null);

  const n = arr.length;
  const score = adversaryScore(algo, arr);
  const ceiling = (n * (n - 1)) / 2;
  const best = Math.max(advBest[algo] ?? 0, score);
  const quadratic = score >= ceiling;

  const update = (next: { algo?: SortAlgo; arr?: number[] }) => {
    setSelected(null);
    setAdversary(next, adversaryScore(next.algo ?? algo, next.arr ?? arr));
  };

  const click = (i: number) => {
    if (selected === null) return setSelected(i);
    if (selected === i) return setSelected(null);
    const next = arr.slice();
    [next[selected], next[i]] = [next[i]!, next[selected]!];
    update({ arr: next });
  };

  return (
    <section className="panel stack" aria-label="Adversary challenge">
      <h2>Adversary: make it work as hard as possible</h2>
      <div className="controls">
        <label>
          Algorithm
          <select value={algo} onChange={(e) => update({ algo: e.target.value as SortAlgo })}>
            {SORT_ALGOS.map((a) => (
              <option key={a} value={a}>
                {SORT_META[a].name}
              </option>
            ))}
          </select>
        </label>
        <label>
          n
          <select value={n} onChange={(e) => update({ arr: shuffled(Number(e.target.value), Date.now()) })}>
            {Array.from({ length: ADV_MAX_N - ADV_MIN_N + 1 }, (_, i) => ADV_MIN_N + i).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => update({ arr: shuffled(n, Date.now()) })}>Shuffle</button>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        Click two values to swap them.
      </p>
      <div className="adversary" role="group" aria-label="Input array">
        {arr.map((v, i) => (
          <button key={i} aria-pressed={selected === i} aria-label={`Position ${i + 1}, value ${v}`} onClick={() => click(i)}>
            {v}
          </button>
        ))}
      </div>
      <p style={{ margin: 0 }} role="status" aria-live="polite">
        <strong className="mono" data-testid="adv-score">
          {score}
        </strong>{' '}
        compares · ceiling: n(n−1)/2 = <span className="mono">{ceiling}</span>, the number of distinct pairs,
        since none of these sorts compares the same pair twice · your best: <span className="mono">{best}</span>
        {quadratic && <span className="status-ok"> · Quadratic reached!</span>}
      </p>
      <p style={{ margin: 0 }}>{NOTES[algo]}</p>
    </section>
  );
}
