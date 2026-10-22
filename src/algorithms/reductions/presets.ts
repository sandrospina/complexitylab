import { fromEdges, lengthWeight } from '../graph/graph';
import type { Graph } from '../graph/graph';
import { CANVAS } from '../graph/presets';
import { gnp, seeded } from './graph-util';

export type GraphPresetId = 'triangle' | 'square' | 'k4' | 'wheel' | 'petersen' | 'cube' | 'random';

/** Each preset is a known yes or no for at least one reduction. */
export const GRAPH_PRESETS: { id: GraphPresetId; label: string }[] = [
  { id: 'triangle', label: 'Triangle' },
  { id: 'square', label: 'Square with a diagonal' },
  { id: 'k4', label: 'K₄ (not 3-colourable)' },
  { id: 'wheel', label: 'Wheel with 5 spokes (not 3-colourable)' },
  { id: 'petersen', label: 'Petersen graph (no Hamiltonian cycle)' },
  { id: 'cube', label: 'Cube (Hamiltonian)' },
  { id: 'random', label: 'Random, 8 vertices' },
];

const { width: W, height: H } = CANVAS;
const ring = (k: number, r: number, phase = -Math.PI / 2): [number, number][] =>
  Array.from({ length: k }, (_, i) => [W / 2 + r * Math.cos(phase + (2 * Math.PI * i) / k), H / 2 + r * Math.sin(phase + (2 * Math.PI * i) / k)]);

function build(pos: [number, number][], pairs: [number, number][]): Graph {
  return fromEdges(pos.length, pairs.map(([u, v]) => [u, v, lengthWeight(pos[u]!, pos[v]!)]), pos.map(([x, y]) => [Math.round(x), Math.round(y)]));
}

export function makeGraphPreset(id: GraphPresetId): Graph {
  switch (id) {
    case 'triangle':
      return build(ring(3, 130), [[0, 1], [1, 2], [0, 2]]);
    case 'square':
      return build(ring(4, 130, -Math.PI / 4), [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2]]);
    case 'k4':
      return build(ring(4, 130, -Math.PI / 4), [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [1, 3]]);
    case 'wheel': {
      const pos: [number, number][] = [[W / 2, H / 2], ...ring(5, 140)];
      return build(pos, [1, 2, 3, 4, 5].flatMap((v) => [[0, v], [v, (v % 5) + 1]] as [number, number][]));
    }
    case 'petersen': {
      const pos = [...ring(5, 160), ...ring(5, 75)];
      const pairs: [number, number][] = [];
      for (let i = 0; i < 5; i++) pairs.push([i, (i + 1) % 5], [i, i + 5], [i + 5, ((i + 2) % 5) + 5]);
      return build(pos, pairs);
    }
    case 'cube': {
      const pos: [number, number][] = [...ring(4, 160, -Math.PI / 4), ...ring(4, 70, -Math.PI / 4)];
      const pairs: [number, number][] = [];
      for (let i = 0; i < 4; i++) pairs.push([i, (i + 1) % 4], [i + 4, ((i + 1) % 4) + 4], [i, i + 4]);
      return build(pos, pairs);
    }
    case 'random': {
      const g = gnp(8, 0.45, seeded(17));
      return build(ring(8, 150), g.adj.flatMap((vs, u) => vs.filter((v) => u < v).map((v) => [u, v] as [number, number])));
    }
  }
}
