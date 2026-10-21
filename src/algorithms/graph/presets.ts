import { mulberry32 } from '../../engine/rng';
import { fromEdges, lengthWeight } from './graph';
import type { Edge, Graph } from './graph';

/** Drawing area of the graph editor, in SVG units. */
export const CANVAS = { width: 600, height: 360 } as const;
export const MAX_EDITOR_N = 30;

export type PresetId = 'tree' | 'path' | 'grid' | 'random';

export const PRESETS: { id: PresetId; label: string }[] = [
  { id: 'tree', label: 'Binary tree (wide)' },
  { id: 'path', label: 'Path (deep)' },
  { id: 'grid', label: 'Grid 5 × 4' },
  { id: 'random', label: 'Random' },
];

function build(pos: [number, number][], pairs: [number, number][]): Graph {
  const edges: Edge[] = pairs.map(([u, v]) => [u, v, lengthWeight(pos[u]!, pos[v]!)]);
  return fromEdges(pos.length, edges, pos);
}

/** 15 vertices in four levels: the frontier of a level-order walk is half the tree. */
function tree(): Graph {
  const pos: [number, number][] = [];
  const pairs: [number, number][] = [];
  for (let v = 0; v < 15; v++) {
    const level = Math.floor(Math.log2(v + 1));
    const first = 2 ** level - 1;
    const slots = 2 ** level;
    pos.push([((v - first + 0.5) / slots) * CANVAS.width, 40 + level * 90]);
    if (v > 0) pairs.push([(v - 1) >> 1, v]);
  }
  return build(pos, pairs);
}

/** 15 vertices snaking across the canvas: one long branch. */
function path(): Graph {
  const pos: [number, number][] = Array.from({ length: 15 }, (_, v) => {
    const row = Math.floor(v / 5);
    const col = row % 2 === 0 ? v % 5 : 4 - (v % 5);
    return [60 + col * 120, 50 + row * 130];
  });
  return build(pos, Array.from({ length: 14 }, (_, v) => [v, v + 1]));
}

function grid(): Graph {
  const pos: [number, number][] = [];
  const pairs: [number, number][] = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 5; c++) {
      const v = r * 5 + c;
      pos.push([60 + c * 120, 45 + r * 90]);
      if (c > 0) pairs.push([v - 1, v]);
      if (r > 0) pairs.push([v - 5, v]);
    }
  return build(pos, pairs);
}

/** 12 scattered vertices, each joined to its two nearest neighbours (a fixed seed, so it is stable). */
function random(): Graph {
  const rng = mulberry32(42);
  const pos: [number, number][] = Array.from({ length: 12 }, () => [
    40 + rng() * (CANVAS.width - 80),
    40 + rng() * (CANVAS.height - 80),
  ]);
  const pairs = new Map<number, [number, number]>();
  pos.forEach((p, u) => {
    const near = pos
      .map((q, v) => [Math.hypot(q[0] - p[0], q[1] - p[1]), v] as const)
      .filter(([, v]) => v !== u)
      .sort((a, b) => a[0] - b[0])
      .slice(0, 2);
    for (const [, v] of near) pairs.set(Math.min(u, v) * 100 + Math.max(u, v), [Math.min(u, v), Math.max(u, v)]);
  });
  return build(pos, [...pairs.values()]);
}

export function makePreset(id: PresetId): Graph {
  return { tree, path, grid, random }[id]();
}
