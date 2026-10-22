import type { Graph } from '../graph/graph';
import { adjacent, nonEdges, vertexRef } from './graph-util';
import { choose2, CnfBuilder, modelValue } from './types';
import type { Reduction, Violation } from './types';

/** For each tour position, the vertices its variables put there. */
export type Tour = number[][];

const posRef = (p: number) => ({ kind: 'position' as const, id: p });

/**
 * Hamiltonian cycle → SAT. x(v, p): vertex v is at position p of the tour. Each position
 * holds one vertex, each vertex one position, and consecutive positions (wrapping round)
 * are adjacent. V² variables and O(V³) clauses: polynomial, but a visibly large blow-up.
 */
export const hamiltonian: Reduction<Graph, Tour> = {
  id: 'hamiltonian',
  name: 'Hamiltonian cycle',
  families: [
    { id: 'pos-filled', label: 'every position holds a vertex' },
    { id: 'pos-one', label: 'no position holds two vertices' },
    { id: 'vertex-placed', label: 'every vertex has a position' },
    { id: 'vertex-once', label: 'no vertex appears twice' },
    { id: 'adjacent', label: 'consecutive vertices are adjacent' },
  ],
  encode: function* ({ instance: g, omit }, ins) {
    const b = new CnfBuilder(ins, hamiltonian.families, omit);
    const V = g.n;
    const x = (v: number, p: number) => v * V + p + 1;
    for (let v = 0; v < V; v++) for (let p = 0; p < V; p++) b.variable(`x${v},${p}: vertex ${v} at position ${p + 1}`, [vertexRef(v), posRef(p)]);
    yield* b.declare(V * V);
    for (let p = 0; p < V; p++)
      yield* b.exactlyOne('pos-filled', 'pos-one', Array.from({ length: V }, (_, v) => x(v, p)), [posRef(p)]);
    for (let v = 0; v < V; v++)
      yield* b.exactlyOne('vertex-placed', 'vertex-once', Array.from({ length: V }, (_, p) => x(v, p)), [vertexRef(v)]);
    for (const [u, v] of nonEdges(g))
      for (let p = 0; p < V; p++) {
        const q = (p + 1) % V;
        yield* b.clause('adjacent', [-x(u, p), -x(v, q)], [vertexRef(u), vertexRef(v)]);
        yield* b.clause('adjacent', [-x(v, p), -x(u, q)], [vertexRef(u), vertexRef(v)]);
      }
    return b.result();
  },
  decode: (g, model) => {
    const t = modelValue(model);
    return Array.from({ length: g.n }, (_, p) => Array.from({ length: g.n }, (_, v) => v).filter((v) => t(v * g.n + p + 1)));
  },
  verify: (g, tour) => {
    const out: Violation[] = [];
    const where = new Map<number, number[]>();
    tour.forEach((vs, p) => {
      if (vs.length === 0) out.push({ family: 'pos-filled', message: `position ${p + 1} is empty`, refs: [posRef(p)] });
      if (vs.length > 1) out.push({ family: 'pos-one', message: `position ${p + 1} holds ${vs.length} vertices`, refs: [posRef(p), ...vs.map(vertexRef)] });
      for (const v of vs) where.set(v, [...(where.get(v) ?? []), p]);
    });
    for (let v = 0; v < g.n; v++) {
      const ps = where.get(v) ?? [];
      if (ps.length === 0) out.push({ family: 'vertex-placed', message: `vertex ${v} is not on the tour`, refs: [vertexRef(v)] });
      if (ps.length > 1) out.push({ family: 'vertex-once', message: `vertex ${v} appears ${ps.length} times`, refs: [vertexRef(v)] });
    }
    tour.forEach((vs, p) => {
      for (const u of vs)
        for (const v of tour[(p + 1) % tour.length]!)
          if (u !== v && !adjacent(g, u, v))
            out.push({ family: 'adjacent', message: `${u} → ${v} is not an edge`, refs: [vertexRef(u), vertexRef(v)] });
    });
    return out;
  },
  brute: (g) => {
    if (g.n === 0) return [];
    // Fix vertex 0 first and try every order of the rest.
    const order = [0];
    const used = Array<boolean>(g.n).fill(false);
    used[0] = true;
    const grow = (): boolean => {
      if (order.length === g.n) return g.n === 1 || adjacent(g, order.at(-1)!, 0);
      for (let v = 1; v < g.n; v++) {
        if (used[v] || !adjacent(g, order.at(-1)!, v)) continue;
        used[v] = true;
        order.push(v);
        if (grow()) return true;
        order.pop();
        used[v] = false;
      }
      return false;
    };
    return grow() ? order.map((v) => [v]) : undefined;
  },
  size: (g) => {
    const V = g.n;
    const one = V * choose2(V);
    return { vars: V * V, families: { 'pos-filled': V, 'pos-one': one, 'vertex-placed': V, 'vertex-once': one, adjacent: 2 * V * nonEdges(g).length } };
  },
};

