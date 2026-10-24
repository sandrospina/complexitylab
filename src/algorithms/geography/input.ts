import type { Rng } from '../../engine/rng';
import { makeQbfInput } from '../qbf/input';
import type { Qbf, Quantifier } from '../qbf/input';
import type { Digraph } from '../reach/input';

/**
 * Generalised Geography: a token starts on `start`. Players take turns moving it along an edge
 * to a vertex it has not visited; a player who cannot move loses. Player 1 moves first.
 */
export interface GeoInput {
  g: Digraph;
  start: number;
  /** Vertex positions in a 0..1 square, for drawing. */
  pos?: [number, number][];
  /** Vertex names, for drawing (default: the vertex number). */
  names?: string[];
}

/**
 * Benchmark boards, built from the formulas whose game tree has no shortcut: n is the number of
 * variables. (Random boards are too irregular to fit one class: their cost depends more on their
 * density than on n.)
 */
export type GeoKind = 'exists-unsat' | 'forall-taut';

export const GEO_KINDS: { id: GeoKind; label: string; xLabel: string }[] = [
  { id: 'exists-unsat', label: 'Board from an all-∃ unsatisfiable formula', xLabel: 'variables n' },
  { id: 'forall-taut', label: 'Board from an all-∀ tautology', xLabel: 'variables n' },
];

export const makeGeoInput = (n: number, kind: GeoKind, rng: Rng): GeoInput => fromQbf(makeQbfInput(n, kind, rng)).game;

/** A board to play on: n vertices, each edge with probability 3/(n − 1). */
export function randomBoard(n: number, rng: Rng): GeoInput {
  const out: number[][] = Array.from({ length: n }, () => []);
  for (let u = 0; u < n; u++) for (let v = 0; v < n; v++) if (u !== v && rng() < 3 / (n - 1)) out[u]!.push(v);
  return { g: { n, out }, start: 0 };
}

/** One diamond per quantifier of the padded prefix; `variable` is undefined for padding. */
export interface Diamond {
  q: Quantifier;
  variable?: number;
  top: number;
  /** Walking through `neg` leaves `pos` free, which makes the variable true; and vice versa. */
  pos: number;
  neg: number;
  bottom: number;
}

export interface Reduction {
  game: GeoInput;
  diamonds: Diamond[];
  /** The vertex where ∀ picks a clause, and one vertex per clause. */
  pick: number;
  clauses: number[];
}

/**
 * TQBF ≤ₚ Geography (Sipser, Theorem 8.14). The prefix is padded with unused variables until it
 * alternates ∃∀∃…∃. Each variable is a diamond top → (xᵢ or ¬xᵢ) → bottom, chained bottom → next
 * top: whoever moves at a top picks the side to walk through, which uses that literal's vertex up
 * and leaves the other free. After the last diamond ∀ picks a clause, and ∃ must answer with one
 * of its literals whose vertex is still free, i.e. a true one. From there ∀ is stuck (the
 * diamond's bottom is used), so ∃ wins exactly when every clause ∀ can pick has a true literal.
 */
export function fromQbf({ prefix, cnf }: Qbf): Reduction {
  const seq: { q: Quantifier; variable?: number }[] = [];
  const want = (q: Quantifier) => seq.length % 2 === 0 ? q === 'E' : q === 'A';
  prefix.forEach((q, i) => {
    if (!want(q)) seq.push({ q: q === 'E' ? 'A' : 'E' });
    seq.push({ q, variable: i + 1 });
  });
  if (seq.length % 2 === 0) seq.push({ q: 'E' });

  const out: number[][] = [];
  const pos: [number, number][] = [];
  const names: string[] = [];
  const sub = (k: number) => String(k).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)]!);
  const vertex = (xy: [number, number], name: string) => {
    out.push([]);
    pos.push(xy);
    names.push(name);
    return out.length - 1;
  };
  const d = seq.length;
  const col = (i: number) => (i + 0.5) / d;
  const half = 0.32 / d;
  const diamonds: Diamond[] = seq.map(({ q, variable }, i) => {
    const x = col(i);
    const label = variable === undefined ? '·' : `x${sub(variable)}`;
    const top = vertex([x, 0], q === 'E' ? '∃' : '∀');
    const p = vertex([x - half, 0.22], variable === undefined ? '·' : label);
    const ng = vertex([x + half, 0.22], variable === undefined ? '·' : `¬${label}`);
    const bottom = vertex([x, 0.44], '');
    out[top]!.push(p, ng);
    out[p]!.push(bottom);
    out[ng]!.push(bottom);
    return { q, variable, top, pos: p, neg: ng, bottom };
  });
  diamonds.forEach((dm, i) => {
    if (i + 1 < d) out[dm.bottom]!.push(diamonds[i + 1]!.top);
  });
  const pick = vertex([0.5, 0.68], 'c');
  out[diamonds.at(-1)!.bottom]!.push(pick);
  const m = cnf.clauses.length;
  const clauses = cnf.clauses.map((clause, j) => {
    const c = vertex([(j + 0.5) / Math.max(m, 1), 1], `C${sub(j + 1)}`);
    out[pick]!.push(c);
    for (const lit of clause) {
      const dm = diamonds.find((x) => x.variable === Math.abs(lit))!;
      out[c]!.push(lit > 0 ? dm.pos : dm.neg);
    }
    return c;
  });
  return { game: { g: { n: out.length, out }, start: diamonds[0]!.top, pos, names }, diamonds, pick, clauses };
}

/** Uninstrumented reference: does the player to move from v (with `used` visited) win? */
export function wins(g: Digraph, v: number, used: boolean[]): boolean {
  for (const w of g.out[v]!) {
    if (used[w]) continue;
    used[w] = true;
    const theyWin = wins(g, w, used);
    used[w] = false;
    if (!theyWin) return true;
  }
  return false;
}

/** The moves from the end of `path` that win for the player making them. */
export function winningMoves(g: Digraph, path: number[]): number[] {
  const used = Array<boolean>(g.n).fill(false);
  for (const v of path) used[v] = true;
  return legalMoves(g, path).filter((w) => {
    used[w] = true;
    const theyWin = wins(g, w, used);
    used[w] = false;
    return !theyWin;
  });
}

export const legalMoves = (g: Digraph, path: number[]) => g.out[path.at(-1)!]!.filter((w) => !path.includes(w));

export interface GeoSnapshot {
  /** The token's path so far, start first. */
  path?: number[];
}
