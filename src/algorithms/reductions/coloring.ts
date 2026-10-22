import type { Graph } from '../graph/graph';
import { pairs, vertexRef, edgeRef } from './graph-util';
import { CnfBuilder, modelValue } from './types';
import type { Reduction, Violation } from './types';

export const COLORS = 3;

/** For each vertex, the colours its variables make true (a proper solution has exactly one). */
export type Coloring = number[][];

const x = (v: number, c: number) => v * COLORS + c + 1;

/**
 * Graph 3-colouring → SAT. x(v, c): vertex v has colour c. Every vertex gets a colour, at
 * most one, and the two ends of every edge differ: 3V variables, V + 3V + 3E clauses.
 */
export const coloring: Reduction<Graph, Coloring> = {
  id: 'coloring',
  name: '3-colouring',
  families: [
    { id: 'has-colour', label: 'every vertex has a colour' },
    { id: 'one-colour', label: 'no vertex has two colours' },
    { id: 'differ', label: 'adjacent vertices differ' },
  ],
  encode: function* ({ instance: g, omit }, ins) {
    const b = new CnfBuilder(ins, coloring.families, omit);
    for (let v = 0; v < g.n; v++) for (let c = 0; c < COLORS; c++) b.variable(`x${v},${c}: vertex ${v} has colour ${c + 1}`, [vertexRef(v)]);
    yield* b.declare(COLORS * g.n);
    for (let v = 0; v < g.n; v++)
      yield* b.exactlyOne('has-colour', 'one-colour', [0, 1, 2].map((c) => x(v, c)), [vertexRef(v)]);
    for (const [u, v] of pairs(g))
      for (let c = 0; c < COLORS; c++) yield* b.clause('differ', [-x(u, c), -x(v, c)], [edgeRef(g, u, v), vertexRef(u), vertexRef(v)]);
    return b.result();
  },
  decode: (g, model) => {
    const t = modelValue(model);
    return Array.from({ length: g.n }, (_, v) => [0, 1, 2].filter((c) => t(x(v, c))));
  },
  verify: (g, col) => {
    const out: Violation[] = [];
    col.forEach((cs, v) => {
      if (cs.length === 0) out.push({ family: 'has-colour', message: `vertex ${v} has no colour`, refs: [vertexRef(v)] });
      if (cs.length > 1) out.push({ family: 'one-colour', message: `vertex ${v} has ${cs.length} colours`, refs: [vertexRef(v)] });
    });
    for (const [u, v] of pairs(g)) {
      const shared = col[u]!.find((c) => col[v]!.includes(c));
      if (shared !== undefined)
        out.push({ family: 'differ', message: `edge ${u}–${v}: both ends have colour ${shared + 1}`, refs: [edgeRef(g, u, v), vertexRef(u), vertexRef(v)] });
    }
    return out;
  },
  brute: (g) => {
    const col = Array<number>(g.n).fill(0);
    for (let k = 0; k < COLORS ** g.n; k++) {
      for (let v = 0, r = k; v < g.n; v++, r = Math.floor(r / COLORS)) col[v] = r % COLORS;
      if (pairs(g).every(([u, v]) => col[u] !== col[v])) return col.map((c) => [c]);
    }
    return undefined;
  },
  size: (g) => ({ vars: COLORS * g.n, families: { 'has-colour': g.n, 'one-colour': 3 * g.n, differ: COLORS * pairs(g).length } }),
};
