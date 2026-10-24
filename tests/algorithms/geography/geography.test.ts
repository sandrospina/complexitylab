import { describe, expect, it } from 'vitest';
import { fromQbf, legalMoves, randomBoard, winningMoves, wins } from '../../../src/algorithms/geography/input';
import { geographyMinimax } from '../../../src/algorithms/geography/minimax';
import { qbfValue } from '../../../src/algorithms/qbf/input';
import type { Qbf, Quantifier } from '../../../src/algorithms/qbf/input';
import { randomKSat } from '../../../src/algorithms/sat/cnf';
import { mulberry32, randInt } from '../../../src/engine/rng';
import { runCount } from '../../../src/engine/runner';

const firstWins = (g: ReturnType<typeof randomBoard>) => {
  const used = Array<boolean>(g.g.n).fill(false);
  used[g.start] = true;
  return wins(g.g, g.start, used);
};

describe('generalised geography', () => {
  it('minimax agrees with the reference on random boards', () => {
    const rng = mulberry32(5);
    let first = 0;
    for (let k = 0; k < 300; k++) {
      const input = randomBoard(randInt(rng, 1, 10), rng);
      const want = firstWins(input);
      if (want) first++;
      const run = runCount(geographyMinimax, input);
      expect(run.result).toBe(want);
      expect(run.counters.peakStack).toBeLessThanOrEqual(input.g.n);
      expect(run.counters.peakMem).toBe(input.g.n);
    }
    expect(first).toBeGreaterThan(50);
    expect(first).toBeLessThan(250);
  });

  it('small boards: a single edge wins for the first player, a path of two edges loses', () => {
    expect(runCount(geographyMinimax, { g: { n: 2, out: [[1], []] }, start: 0 }).result).toBe(true);
    expect(runCount(geographyMinimax, { g: { n: 3, out: [[1], [2], []] }, start: 0 }).result).toBe(false);
    // A cycle back to the start is not a move: the start is visited.
    expect(runCount(geographyMinimax, { g: { n: 2, out: [[1], [0]] }, start: 0 }).result).toBe(true);
  });

  it('TQBF reduces to Geography: ∃ (player 1) wins the board exactly when the formula is true', () => {
    const rng = mulberry32(8);
    let trues = 0;
    for (let k = 0; k < 300; k++) {
      const n = randInt(rng, 1, 6);
      const prefix = Array.from({ length: n }, (): Quantifier => (rng() < 0.5 ? 'E' : 'A'));
      const q: Qbf = { prefix, cnf: randomKSat(n, 0.5 + 1.5 * rng(), randInt(rng, 1, 4), rng) };
      const want = qbfValue(q);
      if (want) trues++;
      const r = fromQbf(q);
      expect(firstWins(r.game)).toBe(want);
      expect(runCount(geographyMinimax, r.game).result).toBe(want);
      // The padded prefix alternates ∃∀…∃, and the board is linear in the formula.
      expect(r.diamonds.map((d) => d.q).join('')).toMatch(/^E(AE)*$/);
      expect(r.game.g.n).toBe(4 * r.diamonds.length + 1 + q.cnf.clauses.length);
    }
    expect(trues).toBeGreaterThan(50);
    expect(trues).toBeLessThan(250);
  });

  it('winning moves are legal moves to positions the opponent loses', () => {
    const rng = mulberry32(2);
    for (let k = 0; k < 100; k++) {
      const { g, start } = randomBoard(8, rng);
      const moves = winningMoves(g, [start]);
      expect(moves.every((w) => legalMoves(g, [start]).includes(w))).toBe(true);
      expect(moves.length > 0).toBe(firstWins({ g, start }));
    }
  });
});
