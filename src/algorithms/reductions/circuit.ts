import { randInt } from '../../engine/rng';
import type { Rng } from '../../engine/rng';

export type GateType = 'and' | 'or' | 'not' | 'xor';

/** Gate g drives wire `inputs + g`; its inputs are earlier wires (b unused for NOT). */
export interface Gate {
  type: GateType;
  a: number;
  b: number;
}

/** A Boolean circuit: wires 0..inputs−1 are inputs, then one wire per gate. */
export interface Circuit {
  inputs: number;
  gates: Gate[];
  /** The wire that must be true. */
  output: number;
}

export const wireCount = (c: Circuit) => c.inputs + c.gates.length;
export const wireName = (c: Circuit, w: number) => (w < c.inputs ? `in${w + 1}` : `g${w - c.inputs + 1}`);

/** What gate g outputs given the wire values so far. */
export function gateValue(g: Gate, wires: boolean[]): boolean {
  const a = wires[g.a]!;
  const b = wires[g.b]!;
  return g.type === 'and' ? a && b : g.type === 'or' ? a || b : g.type === 'xor' ? a !== b : !a;
}

/** Every wire's value for the given inputs. */
export function evaluate(c: Circuit, inputs: boolean[]): boolean[] {
  const w = [...inputs];
  for (const g of c.gates) w.push(gateValue(g, w));
  return w;
}

const TYPES: GateType[] = ['and', 'or', 'not', 'xor'];

/** n random gates over ⌈n/2⌉ + 1 inputs, each reading earlier wires; the last gate is the output. */
export function randomCircuit(n: number, rng: Rng): Circuit {
  const inputs = Math.ceil(n / 2) + 1;
  const gates = Array.from({ length: n }, (_, g): Gate => {
    const avail = inputs + g;
    return { type: TYPES[randInt(rng, 0, 4)]!, a: randInt(rng, 0, avail), b: randInt(rng, 0, avail) };
  });
  return { inputs, gates, output: inputs + n - 1 };
}

/** A small circuit for the editor: (in1 AND in2) XOR (NOT in3), output true. */
export const EXAMPLE_CIRCUIT: Circuit = {
  inputs: 3,
  gates: [
    { type: 'and', a: 0, b: 1 },
    { type: 'not', a: 2, b: 2 },
    { type: 'xor', a: 3, b: 4 },
  ],
  output: 5,
};

/** URL form: "3|and 0 1,not 2 2,xor 3 4|5". */
export const encodeCircuit = (c: Circuit) => `${c.inputs}|${c.gates.map((g) => `${g.type} ${g.a} ${g.b}`).join(',')}|${c.output}`;

export function decodeCircuit(raw: string | null, maxWires: number): Circuit | undefined {
  const m = raw ? /^(\d+)\|([^|]*)\|(\d+)$/.exec(raw) : null;
  if (!m) return undefined;
  const inputs = Number(m[1]);
  const gates: Gate[] = [];
  for (const part of m[2] ? m[2].split(',') : []) {
    const [type, a, b] = part.split(' ');
    const avail = inputs + gates.length;
    if (!TYPES.includes(type as GateType) || !(Number(a) < avail) || !(Number(b) < avail)) return undefined;
    gates.push({ type: type as GateType, a: Number(a), b: Number(b) });
  }
  const c = { inputs, gates, output: Number(m[3]) };
  return inputs >= 1 && wireCount(c) <= maxWires && c.output < wireCount(c) ? c : undefined;
}

/** The circuit with one more input; gate wires shift up by one to make room. */
export function addInput(c: Circuit): Circuit {
  const shift = (w: number) => (w >= c.inputs ? w + 1 : w);
  return { inputs: c.inputs + 1, gates: c.gates.map((g) => ({ ...g, a: shift(g.a), b: shift(g.b) })), output: shift(c.output) };
}

/** Each wire's depth: inputs 0, a gate one more than its deepest input. */
export function depths(c: Circuit): number[] {
  const d = Array<number>(c.inputs).fill(0);
  for (const g of c.gates) d.push(1 + Math.max(d[g.a]!, g.type === 'not' ? 0 : d[g.b]!));
  return d;
}
