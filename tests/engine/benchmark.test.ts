import { describe, expect, it } from 'vitest';
import { benchmark } from '../../src/engine/benchmark-core';
import { MODULES } from '../../src/modules/registry';
import { bestFit } from '../../src/engine/fit';
import { powersOfTwo } from '../../src/engine/benchmark';

describe('benchmark', () => {
  it('produces one point per n', () => {
    const pts = [...benchmark({ algoId: 'search/linear', nValues: [8, 16, 32], inputKind: 'worst', seed: 1 })];
    expect(pts.map((p) => [p.n, p.ops])).toEqual([[8, 8], [16, 16], [32, 32]]);
  });

  it('stops after the first n that exceeds the budget', () => {
    const pts = [
      ...benchmark({
        algoId: 'search/linear',
        nValues: [8, 16, 32, 64],
        inputKind: 'worst',
        seed: 1,
        budget: { maxOps: 20 },
      }),
    ];
    expect(pts.map((p) => p.truncated)).toEqual([false, false, true]);
  });

  it('every registered algorithm measures its textbook class', () => {
    for (const m of MODULES) {
      for (const a of m.algorithms) {
        const pts = [
          ...benchmark({ algoId: a.id, nValues: powersOfTwo(4, 16), inputKind: 'worst', seed: 1 }),
        ].map((p) => ({ n: p.n, y: p.ops }));
        expect(bestFit(pts).cls, a.id).toBe(a.expectedClass);
      }
    }
  });
});
