import { evaluate, gateValue, wireCount } from './circuit';
import type { Circuit, GateType } from './circuit';
import { CnfBuilder, modelValue } from './types';
import type { Ref, Reduction, Violation } from './types';

/** The values a model gives every wire. */
export type WireValues = boolean[];

const gateRef = (g: number): Ref => ({ kind: 'gate', id: g });
const wireRef = (w: number): Ref => ({ kind: 'wire', id: w });
export const CLAUSES_PER_GATE: Record<GateType, number> = { and: 3, or: 3, not: 2, xor: 4 };

/**
 * Circuit-SAT → 3-SAT (Tseitin). One variable per wire, and for each gate the clauses that
 * say "this wire equals the gate applied to its inputs", each at most 3 literals long. Size
 * is linear in the circuit, which is why 3-SAT is as hard as SAT.
 */
export const tseitin: Reduction<Circuit, WireValues> = {
  id: 'tseitin',
  name: 'Circuit → 3-SAT',
  families: [
    { id: 'and', label: 'AND gates' },
    { id: 'or', label: 'OR gates' },
    { id: 'not', label: 'NOT gates' },
    { id: 'xor', label: 'XOR gates' },
    { id: 'output', label: 'the output is true' },
  ],
  encode: function* ({ instance: c, omit }, ins) {
    const B = new CnfBuilder(ins, tseitin.families, omit);
    for (let w = 0; w < wireCount(c); w++) B.variable(w < c.inputs ? `input ${w + 1}` : `gate ${w - c.inputs + 1} output`, [wireRef(w)]);
    yield* B.declare(wireCount(c));
    for (const [k, gate] of c.gates.entries()) {
      const g = c.inputs + k + 1;
      const a = gate.a + 1;
      const b = gate.b + 1;
      const refs = [gateRef(k), wireRef(gate.a), wireRef(gate.b), wireRef(g - 1)];
      const clauses: Record<GateType, number[][]> = {
        and: [[-g, a], [-g, b], [g, -a, -b]],
        or: [[g, -a], [g, -b], [-g, a, b]],
        not: [[g, a], [-g, -a]],
        xor: [[-g, a, b], [-g, -a, -b], [g, -a, b], [g, a, -b]],
      };
      for (const cl of clauses[gate.type]) yield* B.clause(gate.type, cl, refs);
    }
    yield* B.clause('output', [c.output + 1], [wireRef(c.output)]);
    return B.result();
  },
  decode: (c, model) => {
    const t = modelValue(model);
    return Array.from({ length: wireCount(c) }, (_, w) => t(w + 1));
  },
  verify: (c, values) => {
    const out: Violation[] = [];
    const real = evaluate(c, values.slice(0, c.inputs));
    c.gates.forEach((g, k) => {
      const w = c.inputs + k;
      // A gate is wrong if its wire disagrees with its own inputs' values in the model.
      const own = gateValue(g, values);
      if (values[w] !== own) out.push({ family: g.type, message: `gate ${k + 1} (${g.type.toUpperCase()}) outputs ${values[w] ? 1 : 0} but should be ${own ? 1 : 0}`, refs: [gateRef(k)] });
    });
    if (!real[c.output]) out.push({ family: 'output', message: 'with these inputs the circuit outputs 0', refs: [wireRef(c.output)] });
    return out;
  },
  brute: (c) => {
    for (let r = 0; r < 2 ** c.inputs; r++) {
      const w = evaluate(c, Array.from({ length: c.inputs }, (_, i) => Math.floor(r / 2 ** i) % 2 === 1));
      if (w[c.output]) return w;
    }
    return undefined;
  },
  size: (c) => {
    const families: Record<string, number> = { and: 0, or: 0, not: 0, xor: 0, output: 1 };
    for (const g of c.gates) families[g.type]! += CLAUSES_PER_GATE[g.type];
    return { vars: wireCount(c), families };
  },
};
