import { useEffect, useMemo } from 'react';
import { fromQbf, GEO_KINDS, legalMoves, randomBoard, winningMoves } from '../../algorithms/geography/input';
import type { GeoInput, GeoKind, GeoSnapshot, Reduction } from '../../algorithms/geography/input';
import { geographyMinimax } from '../../algorithms/geography/minimax';
import { formatQbf, makeQbfInput, QBF_KINDS, qbfValue } from '../../algorithms/qbf/input';
import type { Qbf } from '../../algorithms/qbf/input';
import { buildCallTree } from '../../engine/calltree';
import type { CallNode } from '../../engine/calltree';
import { bestFit } from '../../engine/fit';
import { mulberry32 } from '../../engine/rng';
import { runTrace } from '../../engine/runner';
import type { TraceResult } from '../../engine/runner';
import { GEO_ALGO_ID, GEO_BOARDS, maxNFor, useGeographyStore } from '../../store/geography';
import type { GeoBoard } from '../../store/geography';
import type { YMetric } from '../../store/time-space';
import { CallTreeView } from '../../views/CallTreeView';
import { MemoryView } from '../../views/MemoryView';
import { PredictWidget } from '../../views/PredictWidget';
import { RaceView } from '../../views/RaceView';
import { ScalingView } from '../../views/ScalingView';
import type { ScalingSeries } from '../../views/ScalingView';
import { Timeline } from '../../views/Timeline';
import { frameAt } from '../../views/trace-frames';
import type { Frame } from '../../views/trace-frames';
import { ClassMap } from './ClassMap';
import { DigraphView } from './DigraphView';

const BOARD_LABEL: Record<GeoBoard, string> = {
  random: 'Random board',
  ...(Object.fromEntries(QBF_KINDS.map((k) => [k.id, `Formula: ${k.label}`])) as Record<Exclude<GeoBoard, 'random'>, string>),
};
const COLOR = '#2e9a6a';
const DOMAIN: [number, number] = [1, 16];
const Y_LABEL: Record<YMetric, string> = { ops: 'operations', mem: 'peak memory (cells + frames)' };
/** The computer's reply comes after a short pause, so the student sees their own move land. */
const REPLY_MS = 450;

interface Setup {
  game: GeoInput;
  qbf?: Qbf;
  reduction?: Reduction;
}

function makeSetup(board: GeoBoard, n: number, seed: number): Setup {
  if (board === 'random') return { game: randomBoard(n, mulberry32(seed)) };
  const qbf = makeQbfInput(n, board, mulberry32(seed));
  const reduction = fromQbf(qbf);
  return { game: reduction.game, qbf, reduction };
}

const nameOf = (game: GeoInput, v: number) => (game.names ? game.names[v]! : String(v));

/** The board, playable: the student is player 1, the computer answers with a minimax move. */
function Board({ setup }: { setup: Setup }) {
  const { path: stored, reveal } = useGeographyStore();
  const { setPath, setReveal } = useGeographyStore.getState();
  const { game } = setup;
  const path = useMemo(() => (stored.length > 0 ? stored : [game.start]), [stored, game]);
  const moves = legalMoves(game.g, path);
  const yourTurn = path.length % 2 === 1;
  const winning = useMemo(() => new Set(winningMoves(game.g, path)), [game, path]);

  // Keyed on the path's contents, so re-renders from elsewhere (the timeline playing) don't restart the pause.
  const key = path.join(',');
  useEffect(() => {
    const p = key.split(',').map(Number);
    const legal = legalMoves(game.g, p);
    if (p.length % 2 === 1 || legal.length === 0) return;
    const reply = winningMoves(game.g, p)[0] ?? legal[0]!;
    const id = setTimeout(() => setPath([...p, reply]), REPLY_MS);
    return () => clearTimeout(id);
  }, [key, game, setPath]);

  const status =
    moves.length === 0
      ? yourTurn
        ? 'You have no move: the computer wins.'
        : 'The computer has no move: you win!'
      : yourTurn
        ? `Your move${setup.qbf ? ` (you are ∃)` : ''}: click a highlighted vertex.`
        : 'The computer is thinking…';
  const d = setup.reduction?.diamonds.length ?? 0;
  const pos = setup.reduction && game.pos;
  return (
    <section className="panel stack" aria-label="Play">
      <h2>Play: you move first</h2>
      <DigraphView
        n={game.g.n}
        out={game.g.out}
        pos={pos}
        width={pos ? Math.max(480, d * 125) : 420}
        height={pos ? 380 : 300}
        label={`Geography board with ${game.g.n} vertices; the token is on ${nameOf(game, path.at(-1)!)}`}
        vertexText={(v) => nameOf(game, v)}
        vertexClass={(v) => {
          if (v === path.at(-1)) return 'current';
          if (path.includes(v)) return 'used';
          if (yourTurn && moves.includes(v)) return reveal ? (winning.has(v) ? 'win' : 'lose') : 'end';
          return undefined;
        }}
        edgeClass={(u, v) => (path.indexOf(v) === path.indexOf(u) + 1 && path.includes(u) && path.includes(v) ? 'hot' : undefined)}
        onVertex={(v) => yourTurn && moves.includes(v) && setPath([...path, v])}
        vertexLabel={(v) => `vertex ${nameOf(game, v)}${yourTurn && moves.includes(v) ? ', a legal move' : ''}`}
      />
      <div className="controls">
        <strong aria-live="polite" data-testid="geo-status">
          {status}
        </strong>
        <button onClick={() => setPath([])}>New game</button>
        <label>
          <input type="checkbox" checked={reveal} onChange={(e) => setReveal(e.target.checked)} /> Show which moves win
        </label>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        Move the token (orange) along an arrow to a vertex it has not visited. Whoever cannot move loses.
        {reveal && ' Green moves win for you whatever the computer does; red moves lose against best play.'}
        {setup.qbf &&
          ' Each diamond is a variable: whoever moves at its top picks a side, and walking through ¬xᵢ uses it up and leaves xᵢ free, making xᵢ true. After the last diamond ∀ picks a clause Cⱼ, and ∃ must answer with one of its literals whose vertex is still free. Diamonds marked · are padding, so that the turns alternate ∃, ∀, ∃, ….'}
      </p>
    </section>
  );
}

/** Minimax's search tree: green positions win for the player to move, red ones lose. */
function SearchTree({ game, trace, frame }: { game: GeoInput; trace: TraceResult<unknown>; frame: Frame<GeoSnapshot> }) {
  const nodes = useMemo(() => buildCallTree(trace.steps, 'total'), [trace]);
  const vertex = (node: CallNode) => Number(node.label.slice(3));
  const won = (node: CallNode) => trace.steps[node.endStep!]!.event.value === 1;
  return (
    <CallTreeView
      nodes={nodes}
      step={frame.step}
      noun="positions"
      nodeText={(node) => nameOf(game, vertex(node))}
      nodeClass={(node) => (node.endStep !== undefined && frame.step > node.endStep ? (won(node) ? 'model' : 'conflict') : undefined)}
    />
  );
}

export function GeographyTab() {
  const { board, n, seed, step, benchKind, yMetric, predictions, bench, benchRunning } = useGeographyStore();
  const { configure, setStep, setBenchKind, setYMetric, predict, runBench } = useGeographyStore.getState();
  const setup = useMemo(() => makeSetup(board, n, seed), [board, n, seed]);
  const trace = useMemo(() => runTrace(geographyMinimax, setup.game), [setup]);
  const maxStep = trace.steps.length;
  const s = Math.min(step, maxStep);

  const pts = bench.filter((p) => !p.truncated).map((p) => ({ n: p.n, ops: yMetric === 'ops' ? p.ops : p.peakMem + p.peakStack }));
  const series: ScalingSeries[] =
    pts.length === 0
      ? []
      : [{ label: 'Minimax', color: COLOR, points: pts, fit: !benchRunning && pts.length >= 3 ? bestFit(pts.map((p) => ({ n: p.n, y: p.ops }))) : undefined }];

  return (
    <div className="stack">
      <ClassMap highlight="PSPACE" />
      <section className="panel controls" aria-label="Board">
        <label>
          Board
          <select value={board} onChange={(e) => configure({ board: e.target.value as GeoBoard })}>
            {GEO_BOARDS.map((b) => (
              <option key={b} value={b}>
                {BOARD_LABEL[b]}
              </option>
            ))}
          </select>
        </label>
        <label>
          n = <span className="mono">{n}</span>
          <input
            type="range"
            min={board === 'random' ? 2 : 1}
            max={maxNFor(board)}
            value={n}
            onChange={(e) => configure({ n: Number(e.target.value) })}
            aria-label={board === 'random' ? 'Number of vertices n' : 'Number of variables n'}
          />
        </label>
        <button onClick={() => configure({ seed: seed + 1 })}>New board</button>
        {setup.qbf && (
          <span className="mono" data-testid="geo-formula">
            {formatQbf(setup.qbf)}: {qbfValue(setup.qbf) ? 'true, so ∃ (you) can always win' : 'false, so ∀ (the computer) can always win'}
          </span>
        )}
      </section>

      <p className="muted" style={{ margin: 0 }}>
        Generalised Geography is the children’s game of naming places that start with the last letter of the previous one,
        played on any directed graph. Deciding who wins is PSPACE-complete. It is in PSPACE because a game lasts at most n
        moves, so minimax only ever holds one game on its stack. And it is PSPACE-hard because any quantified formula can
        be turned into a board, in polynomial time, whose first player wins exactly when the formula is true. Pick a
        formula board to play the formula as a game.
      </p>

      <Board setup={setup} />

      <div className="grid-2">
        <RaceView<GeoSnapshot>
          step={s}
          metric="total"
          metricLabel="ops"
          n={n}
          entries={[
            {
              key: 'geography',
              algoId: GEO_ALGO_ID,
              name: 'Minimax: who wins from the start?',
              color: COLOR,
              trace,
              render: (f) => (
                <div className="stack" style={{ gap: 6 }}>
                  <SearchTree game={setup.game} trace={trace} frame={f} />
                  <span className="mono" style={{ fontSize: 13 }} data-testid="result-geography">
                    {f.step >= trace.steps.length ? (trace.result ? 'player 1 wins with best play' : 'player 2 wins with best play') : '…'}
                  </span>
                </div>
              ),
            },
          ]}
        />
        <MemoryView rows={[{ label: 'Minimax', counters: frameAt(trace, s).counters }]} />
      </div>

      <Timeline step={s} maxStep={maxStep} onStep={(v) => setStep(Math.min(v, maxStep))} />

      <section className="panel emphasis stack" aria-label="Scaling">
        <h2>Scaling: one game on the stack, every game in the time</h2>
        <PredictWidget
          key={yMetric}
          algorithm={`Minimax (${yMetric === 'ops' ? 'time' : 'space'})`}
          value={predictions[yMetric]}
          onChange={(c) => predict(yMetric, c)}
          measured={series[0]?.fit?.cls}
          disabled={benchRunning}
        />
        <div className="controls">
          <label>
            Boards
            <select value={benchKind} onChange={(e) => setBenchKind(e.target.value as GeoKind)}>
              {GEO_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
          <button className="primary" onClick={runBench} disabled={benchRunning}>
            {benchRunning ? 'Running…' : 'Run scaling experiment'}
          </button>
          <label>
            Plot
            <select aria-label="Scaling metric" value={yMetric} onChange={(e) => setYMetric(e.target.value as YMetric)}>
              <option value="ops">Operations (time)</option>
              <option value="mem">Peak memory (space)</option>
            </select>
          </label>
        </div>
        <ScalingView series={series} domain={DOMAIN} xLabel="variables n of the formula" yLabel={Y_LABEL[yMetric]} initialLogY />
        <p className="muted" style={{ margin: 0 }}>
          On the board built from an unsatisfiable all-∃ formula, ∃ must try both sides of every diamond before giving up,
          so minimax plays out all 2ⁿ games, while its memory grows only with the board. Random boards are left out of
          the experiment: their cost depends more on how many edges they happen to have than on n.
        </p>
      </section>
    </div>
  );
}
