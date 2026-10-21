import { useMemo } from 'react';
import { binarySearchRecursive } from '../../algorithms/search/binaryRecursive';
import { makeSearchInput } from '../../algorithms/search/input';
import { makeSortInput } from '../../algorithms/sort/input';
import type { SortSnapshot } from '../../algorithms/sort/input';
import { replayArray } from '../../algorithms/sort/replay';
import { buildCallTree } from '../../engine/calltree';
import { mulberry32 } from '../../engine/rng';
import { runTrace } from '../../engine/runner';
import { TREE_ALGOS, useSortingStore } from '../../store/sorting';
import type { TreeAlgo } from '../../store/sorting';
import { RecursionTreeView } from '../../views/RecursionTreeView';
import { Tex } from '../../views/Tex';
import { Timeline } from '../../views/Timeline';
import { frameAt } from '../../views/trace-frames';
import { BarsView } from './BarsView';
import { masterTheorem, recurrenceTex } from './master';
import type { Recurrence } from './master';
import { SORT_META } from './meta';

const TREE_NAME: Record<TreeAlgo, string> = {
  merge: SORT_META.merge.name,
  'quick-naive': SORT_META['quick-naive'].name,
  'quick-random': SORT_META['quick-random'].name,
  binary: 'Binary search (recursive)',
};

const RECURRENCE: Record<TreeAlgo, { rec: Recurrence; why: string }> = {
  merge: { rec: { a: 2, b: 2, k: 1 }, why: 'Two recursive calls on halves, then a linear-time merge.' },
  binary: { rec: { a: 1, b: 2, k: 0 }, why: 'One recursive call on half the range, plus one comparison.' },
  'quick-random': {
    rec: { a: 2, b: 2, k: 1 },
    why: 'A random pivot splits near the middle on average, so the expected cost behaves like two half-size calls plus a linear partition.',
  },
  'quick-naive': {
    rec: { a: 2, b: 2, k: 1 },
    why: 'On random input the last element is a typical pivot, so it behaves like two half-size calls plus a linear partition.',
  },
};

const FORM = 'T(n) = a\\,T(n/b) + \\Theta(n^k),\\quad c = \\log_b a';
const CASES =
  'T(n) = \\begin{cases} \\Theta(n^c) & k < c \\\\ \\Theta(n^k \\log n) & k = c \\\\ \\Theta(n^k) & k > c \\end{cases}';

export function TreeTab() {
  const { treeAlgo, n, preset, seed, step } = useSortingStore();
  const { configure, setStep } = useSortingStore.getState();

  const run = useMemo(() => {
    if (treeAlgo === 'binary') {
      const input = makeSearchInput(n, 'worst', mulberry32(seed));
      return { arr: undefined, trace: runTrace(binarySearchRecursive, input) };
    }
    const input = makeSortInput(n, preset, mulberry32(seed));
    return { arr: input.arr, trace: runTrace(SORT_META[treeAlgo].generator, input) };
  }, [treeAlgo, n, preset, seed]);
  const nodes = useMemo(() => buildCallTree(run.trace.steps, 'compare'), [run]);

  const maxStep = run.trace.steps.length;
  const s = Math.min(step, maxStep);
  const frame = frameAt<SortSnapshot>(run.trace, s);
  const total = run.trace.counters.ops.compare;

  const skewed = treeAlgo === 'quick-naive' && (preset === 'sorted' || preset === 'reversed');
  const { rec, why } = RECURRENCE[treeAlgo];
  const m = masterTheorem(rec);

  return (
    <div className="stack">
      <section className="panel controls" aria-label="Recursion">
        <label>
          Recursion
          <select value={treeAlgo} onChange={(e) => configure({ treeAlgo: e.target.value as TreeAlgo })}>
            {TREE_ALGOS.map((a) => (
              <option key={a} value={a}>
                {TREE_NAME[a]}
              </option>
            ))}
          </select>
        </label>
        {treeAlgo === 'binary' && <span className="muted">Worst case: the target is absent.</span>}
      </section>

      {run.arr && (
        <section className="panel" aria-label="Array">
          <BarsView arr={replayArray(run.arr, run.trace.steps, frame.step)} event={frame.event} snap={frame.snapshot} />
        </section>
      )}
      <Timeline step={s} maxStep={maxStep} onStep={(v) => setStep(Math.min(v, maxStep))} />

      <section className="panel emphasis stack" aria-label="Recursion tree">
        <h2>Recursion tree: compares per call, summed per level</h2>
        <RecursionTreeView
          key={treeAlgo}
          nodes={nodes}
          n={n}
          step={s}
          costLabel="compares"
          offset={(node) => (node.snapshot as SortSnapshot | undefined)?.lo}
        />
        <p style={{ margin: 0 }}>
          Measured total: <strong className="mono">{total}</strong> compares. For comparison,{' '}
          <Tex tex={`n \\log_2 n = ${Math.round(n * Math.log2(n))}`} /> and{' '}
          <Tex tex={`n(n-1)/2 = ${(n * (n - 1)) / 2}`} />.
        </p>
      </section>

      <section className="panel stack" aria-label="Master theorem">
        <h2>Master theorem</h2>
        <Tex block tex={FORM} />
        <Tex block tex={CASES} />
        {skewed ? (
          <p style={{ margin: 0 }}>
            On {preset} input the last pivot is always an extreme value, so one side is empty every time:{' '}
            <Tex tex="T(n) = T(n-1) + \Theta(n)" />. That is not of the form <Tex tex="a\,T(n/b) + f(n)" />, so the
            master theorem does not apply. The tree is a path of depth n − 1, and its levels sum to{' '}
            <Tex tex="n(n-1)/2 = \Theta(n^2)" />.
          </p>
        ) : (
          <p style={{ margin: 0 }}>
            {why} <Tex tex={recurrenceTex(rec)} />: <Tex tex={`k = ${m.reason}`} />, so case {m.case} gives{' '}
            <strong>
              <Tex tex={`T(n) = ${m.bound}`} />
            </strong>
            .
          </p>
        )}
      </section>
    </div>
  );
}
