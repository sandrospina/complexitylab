import { useMemo } from 'react';
import { side } from '../../algorithms/sudoku/board';
import type { Board, SudokuSnapshot } from '../../algorithms/sudoku/board';
import { checkSudoku } from '../../algorithms/sudoku/check';
import type { CheckResult } from '../../algorithms/sudoku/check';
import type { SubsetSumInput } from '../../algorithms/subset-sum/input';
import { verifySubsetSum } from '../../algorithms/subset-sum/verify';
import type { VerifyResult } from '../../algorithms/subset-sum/verify';
import { bestFit } from '../../engine/fit';
import { runCount, runTrace } from '../../engine/runner';
import {
  makePuzzle,
  makeSubsetInstance,
  MAX_SUBSET_N,
  MIN_SUBSET_N,
  SIZES,
  TABS,
  useVerifyStore,
  verifyAlgoId,
} from '../../store/verify';
import type { Size, Tab, VerifyAlgo } from '../../store/verify';
import { useUrlParams } from '../../store/url-state';
import { AlgorithmView } from '../../views/AlgorithmView';
import { SudokuGrid } from '../../views/SudokuGrid';
import { MemoryView } from '../../views/MemoryView';
import { ScalingView } from '../../views/ScalingView';
import type { ScalingSeries } from '../../views/ScalingView';
import { Timeline } from '../../views/Timeline';
import { frameAt } from '../../views/trace-frames';
import { useSolve } from '../../views/useSolve';
import { findAlgorithm } from '../registry';

const TAB_LABEL: Record<Tab, string> = { sudoku: 'Sudoku', subset: 'Subset sum' };
const META: Record<VerifyAlgo, { name: string; color: string }> = {
  'sudoku-check': { name: 'Checker', color: '#2e9a6a' },
  'sudoku-solve': { name: 'Solver', color: '#c2417a' },
  'subset-check': { name: 'Verifier', color: '#2e9a6a' },
  'subset-solve': { name: 'Search', color: '#c2417a' },
};
const fmt = (x: number) => Math.round(x).toLocaleString('en-US');

function useSeries(algos: VerifyAlgo[]): ScalingSeries[] {
  const { bench, benchRunning } = useVerifyStore();
  return algos.flatMap((a) => {
    const pts = (bench[a] ?? []).filter((p) => !p.truncated).map((p) => ({ n: p.n, ops: p.ops }));
    if (pts.length === 0) return [];
    const fit = !benchRunning && pts.length >= 3 ? bestFit(pts.map((p) => ({ n: p.n, y: p.ops }))) : undefined;
    return [{ label: META[a].name, color: META[a].color, points: pts, fit }];
  });
}

const xLabel = (a: VerifyAlgo) => findAlgorithm(verifyAlgoId(a)).inputKinds[0]!.xLabel ?? 'input size n';

function SudokuTab() {
  const { size, seed, entries, step, benchRunning } = useVerifyStore();
  const { newPuzzle, setCell, fill, setStep, runBench } = useVerifyStore.getState();
  const { puzzle, solution } = useMemo(() => makePuzzle(size, seed), [size, seed]);
  const board = useMemo<Board>(() => ({ ...puzzle, cells: entries }), [puzzle, entries]);
  const check = useMemo(() => runTrace(checkSudoku, board), [board]);
  const solve = useSolve<Board>(verifyAlgoId('sudoku-solve'), puzzle);
  const s = Math.min(step, check.steps.length);
  const frame = frameAt<SudokuSnapshot>(check, s);
  const verdict = check.result as CheckResult;
  const blanks = puzzle.cells.filter((v) => v === 0).length;
  const checkSeries = useSeries(['sudoku-check']);
  const solveSeries = useSeries(['sudoku-solve']);
  const domainCheck = useMemo<[number, number]>(() => [1, 25], []);
  const domainSolve = useMemo<[number, number]>(() => [1, 64], []);

  return (
    <div className="stack">
      <section className="panel controls" aria-label="Puzzle">
        <label>
          Board
          <select value={size} onChange={(e) => newPuzzle(e.target.value as Size, seed)}>
            {SIZES.map((z) => (
              <option key={z} value={z}>
                {z} × {z}
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => newPuzzle(size, seed + 1)}>New puzzle</button>
        <button onClick={() => fill(solution.cells)}>Reveal solution</button>
        <button onClick={() => fill(puzzle.cells)}>Clear my entries</button>
        <span className="muted">{blanks} blanks to fill</span>
      </section>

      <div className="grid-2">
        <AlgorithmView title="Your board, as the checker sees it" event={frame.event}>
          <div className="stack">
            <SudokuGrid board={board} givens={puzzle.cells} focus={frame.snapshot?.cell} onSet={setCell} />
            <p style={{ margin: 0 }} role="status">
              <strong className={verdict.valid ? 'status-ok' : undefined} data-testid="check-verdict">
                {verdict.valid ? 'Valid solution' : 'Not a solution yet'}
              </strong>{' '}
              {!verdict.valid && verdict.cell !== undefined && (
                <span className="muted">
                  (first problem at row {Math.floor(verdict.cell / side(board)) + 1}, column {(verdict.cell % side(board)) + 1})
                </span>
              )}
            </p>
            {frame.snapshot?.unit && <span className="muted mono">checking {frame.snapshot.unit}</span>}
          </div>
        </AlgorithmView>
        <div className="stack top">
          <section className="panel stack" aria-label="Verify vs solve">
            <h2>Verify vs solve</h2>
            <table className="level-sums">
              <tbody>
                <tr>
                  <th scope="row">Checking your board</th>
                  <td className="mono" data-testid="check-ops">
                    {fmt(check.counters.totalOps)}
                  </td>
                  <td>ops</td>
                </tr>
                <tr>
                  <th scope="row">Solving the puzzle</th>
                  <td className="mono" data-testid="solve-ops">
                    {solve.status === 'done' ? fmt(solve.ops) : '…'}
                  </td>
                  <td>ops</td>
                </tr>
              </tbody>
            </table>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              The checker reads each cell three times (row, column, box): {3 * side(board) ** 2} reads at most, whatever the
              puzzle. The solver guesses, checks and backtracks; its cost depends on the puzzle and explodes as blanks grow.
            </p>
          </section>
          <MemoryView rows={[{ label: 'Checker', counters: frame.counters }]} />
        </div>
      </div>

      <Timeline step={s} maxStep={check.steps.length} onStep={(v) => setStep(Math.min(v, check.steps.length))} />

      <section className="panel emphasis stack" aria-label="Scaling">
        <h2>Scaling: checking stays cheap, solving does not</h2>
        <div>
          <button className="primary" onClick={() => runBench(['sudoku-check', 'sudoku-solve'])} disabled={benchRunning}>
            {benchRunning ? 'Running…' : 'Run scaling experiments'}
          </button>
        </div>
        <div className="grid-2 even">
          <div className="stack">
            <strong>Checker, on boards of side s</strong>
            <ScalingView series={checkSeries} domain={domainCheck} xLabel={xLabel('sudoku-check')} />
          </div>
          <div className="stack">
            <strong>Solver, on a 9 × 9 with more and more blanks (median of 64 puzzles)</strong>
            <ScalingView series={solveSeries} domain={domainSolve} xLabel={xLabel('sudoku-solve')} initialLogY />
          </div>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Checking an s × s board is O(s²), linear in the number of cells. Backtracking grows exponentially in the
          blanks, with a base well below 2 (the fit reports it): exponential does not have to mean 2ⁿ.
        </p>
      </section>
    </div>
  );
}

function SubsetTab() {
  const { subsetN, subsetSeed, chosen, benchRunning } = useVerifyStore();
  const { newSubset, toggle, setChosen, runBench } = useVerifyStore.getState();
  const instance = useMemo<SubsetSumInput>(() => makeSubsetInstance(subsetN, subsetSeed), [subsetN, subsetSeed]);
  const cert = chosen.filter((i) => i < subsetN);
  const verify = runCount(verifySubsetSum, { ...instance, cert });
  const verdict = verify.result as VerifyResult;
  const solve = useSolve<number[]>(verifyAlgoId('subset-solve'), instance);
  const sum = cert.reduce((s, i) => s + instance.nums[i]!, 0);
  const series = useSeries(['subset-check', 'subset-solve']);
  const domain = useMemo<[number, number]>(() => [2, 2 ** 16], []);

  return (
    <div className="stack">
      <section className="panel controls" aria-label="Instance">
        <label>
          n = <span className="mono">{subsetN}</span>
          <input
            type="range"
            min={MIN_SUBSET_N}
            max={MAX_SUBSET_N}
            value={subsetN}
            onChange={(e) => newSubset(Number(e.target.value), subsetSeed)}
            aria-label="How many numbers"
          />
        </label>
        <button onClick={() => newSubset(subsetN, subsetSeed + 1)}>New numbers</button>
        <button
          onClick={() => solve.status === 'done' && solve.result && setChosen(solve.result)}
          disabled={solve.status !== 'done' || !solve.result}
        >
          Show a solution
        </button>
      </section>

      <div className="grid-2">
        <section className="panel stack" aria-label="Pick a subset">
          <h2>
            Pick numbers that sum to <span className="mono">{instance.target}</span>
          </h2>
          <div className="adversary">
            {instance.nums.map((x, i) => (
              <button key={i} aria-pressed={cert.includes(i)} onClick={() => toggle(i)} aria-label={`Number ${i + 1}, value ${x}`}>
                {x}
              </button>
            ))}
          </div>
          <p style={{ margin: 0 }} role="status">
            Your sum: <strong className="mono">{sum}</strong>.{' '}
            <strong className={verdict.valid ? 'status-ok' : undefined} data-testid="subset-verdict">
              {verdict.valid ? 'Certificate accepted' : `Rejected: ${verdict.reason}`}
            </strong>
          </p>
        </section>
        <section className="panel stack top" aria-label="Verify vs solve">
          <h2>Verify vs solve</h2>
          <table className="level-sums">
            <tbody>
              <tr>
                <th scope="row">Verifying your pick</th>
                <td className="mono" data-testid="verify-ops">
                  {fmt(verify.counters.totalOps)}
                </td>
                <td>ops</td>
              </tr>
              <tr>
                <th scope="row">Searching for a subset</th>
                <td className="mono" data-testid="search-ops">
                  {solve.status === 'done' ? fmt(solve.ops) : '…'}
                </td>
                <td>ops</td>
              </tr>
            </tbody>
          </table>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Verifying adds up the numbers you picked. Search may have to try all 2<sup>{subsetN}</sup> ={' '}
            {fmt(2 ** subsetN)} subsets: it is lucky here only if a solution comes early in its order.
          </p>
        </section>
      </div>

      <section className="panel emphasis stack" aria-label="Scaling">
        <h2>Scaling: verify in O(n), search in O(2ⁿ)</h2>
        <div>
          <button className="primary" onClick={() => runBench(['subset-check', 'subset-solve'])} disabled={benchRunning}>
            {benchRunning ? 'Running…' : 'Run scaling experiment'}
          </button>
        </div>
        <ScalingView series={series} domain={domain} initialLogX initialLogY />
        <p className="muted" style={{ margin: 0 }}>
          Search is measured with no solution present, its worst case. That gap, an easy check against a hard search,
          is what the class NP captures: problems whose answers can be verified quickly.
        </p>
      </section>
    </div>
  );
}

export default function VerifyModule() {
  const { tab, size, seed, entries, step, subsetN, subsetSeed, chosen } = useVerifyStore();
  const { setTab } = useVerifyStore.getState();
  const puzzle = useMemo(() => makePuzzle(size, seed).puzzle, [size, seed]);
  const edited = entries.some((v, i) => v !== puzzle.cells[i]);
  useUrlParams('verify', {
    tab,
    size,
    seed,
    ...(edited ? { e: entries.join('.') } : {}),
    step,
    sn: subsetN,
    sseed: subsetSeed,
    ...(chosen.length ? { pick: chosen.join('.') } : {}),
  });
  return (
    <div className="stack">
      <div className="tabs" role="tablist" aria-label="Verify vs solve">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={TAB_LABEL[tab]}>
        {tab === 'sudoku' ? <SudokuTab /> : <SubsetTab />}
      </div>
    </div>
  );
}
