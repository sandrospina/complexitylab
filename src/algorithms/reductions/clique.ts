import type { Graph } from '../graph/graph';
import { adjacent, nonEdges, vertexRef } from './graph-util';
import { choose2, CnfBuilder, modelValue } from './types';
import type { Reduction, Violation } from './types';

export interface CliqueInstance {
  g: Graph;
  k: number;
}

/** For each of the k slots, the vertices its variables put there. */
export type CliqueSlots = number[][];

const slotRef = (i: number) => ({ kind: 'slot' as const, id: i });

/**
 * k-clique → SAT. x(i, v): vertex v is the i-th member. Each slot holds exactly one vertex,
 * no vertex fills two slots, and no two non-adjacent vertices are both in: kV variables,
 * O(k²V²) clauses, because every non-edge is excluded for every pair of slots.
 */
export const clique: Reduction<CliqueInstance, CliqueSlots> = {
  id: 'clique',
  name: 'k-clique',
  families: [
    { id: 'slot-filled', label: 'every slot holds a vertex' },
    { id: 'slot-one', label: 'no slot holds two vertices' },
    { id: 'distinct', label: 'no vertex fills two slots' },
    { id: 'adjacent', label: 'members are pairwise adjacent' },
  ],
  encode: function* ({ instance: { g, k }, omit }, ins) {
    const b = new CnfBuilder(ins, clique.families, omit);
    const x = (i: number, v: number) => i * g.n + v + 1;
    for (let i = 0; i < k; i++) for (let v = 0; v < g.n; v++) b.variable(`x${i},${v}: slot ${i + 1} is vertex ${v}`, [slotRef(i), vertexRef(v)]);
    yield* b.declare(k * g.n);
    for (let i = 0; i < k; i++)
      yield* b.exactlyOne('slot-filled', 'slot-one', Array.from({ length: g.n }, (_, v) => x(i, v)), [slotRef(i)]);
    for (let v = 0; v < g.n; v++)
      for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) yield* b.clause('distinct', [-x(i, v), -x(j, v)], [vertexRef(v)]);
    for (const [u, v] of nonEdges(g))
      for (let i = 0; i < k; i++)
        for (let j = 0; j < k; j++) if (i !== j) yield* b.clause('adjacent', [-x(i, u), -x(j, v)], [vertexRef(u), vertexRef(v)]);
    return b.result();
  },
  decode: ({ g, k }, model) => {
    const t = modelValue(model);
    return Array.from({ length: k }, (_, i) => Array.from({ length: g.n }, (_, v) => v).filter((v) => t(i * g.n + v + 1)));
  },
  verify: ({ g }, slots) => {
    const out: Violation[] = [];
    slots.forEach((vs, i) => {
      if (vs.length === 0) out.push({ family: 'slot-filled', message: `slot ${i + 1} is empty`, refs: [slotRef(i)] });
      if (vs.length > 1) out.push({ family: 'slot-one', message: `slot ${i + 1} holds ${vs.length} vertices`, refs: [slotRef(i), ...vs.map(vertexRef)] });
    });
    const members = slots.flat();
    const seen = new Set<number>();
    for (const v of members) {
      if (seen.has(v)) out.push({ family: 'distinct', message: `vertex ${v} fills two slots`, refs: [vertexRef(v)] });
      seen.add(v);
    }
    const set = [...seen];
    for (let a = 0; a < set.length; a++)
      for (let c = a + 1; c < set.length; c++)
        if (!adjacent(g, set[a]!, set[c]!))
          out.push({ family: 'adjacent', message: `vertices ${set[a]} and ${set[c]} are not adjacent`, refs: [vertexRef(set[a]!), vertexRef(set[c]!)] });
    return out;
  },
  brute: ({ g, k }) => {
    if (k === 0) return [];
    // Grow sets of increasing vertices; any k pairwise adjacent ones are a clique.
    const pick: number[] = [];
    const grow = (from: number): boolean => {
      if (pick.length === k) return true;
      for (let v = from; v < g.n; v++) {
        if (!pick.every((u) => adjacent(g, u, v))) continue;
        pick.push(v);
        if (grow(v + 1)) return true;
        pick.pop();
      }
      return false;
    };
    return grow(0) ? pick.map((v) => [v]) : undefined;
  },
  size: ({ g, k }) => ({
    vars: k * g.n,
    families: { 'slot-filled': k, 'slot-one': k * choose2(g.n), distinct: g.n * choose2(k), adjacent: k * (k - 1) * nonEdges(g).length },
  }),
};
