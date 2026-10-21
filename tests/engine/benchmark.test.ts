import { describe, expect, it } from 'vitest';
import { benchmark } from '../../src/engine/benchmark-core';
import { benchSizes, MODULES } from '../../src/modules/registry';
import { bestFit } from '../../src/engine/fit';

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

  // The instrumentation audit: each algorithm, on each input kind, must measure as its textbook class.
  const cases = MODULES.flatMap((m) =>
    m.algorithms.flatMap((a) => a.inputKinds.map((k) => [a.id, k.id, a.expected[k.id]] as const)),
  );
  it.each(cases)('%s on %s input measures %s', (algoId, kind) => {
    const spec = MODULES.flatMap((m) => m.algorithms).find((a) => a.id === algoId)!;
    const pts = [...benchmark({ algoId, nValues: benchSizes(spec), inputKind: kind, seed: 1 })]
      .filter((p) => !p.truncated)
      .map((p) => ({ n: p.n, y: p.ops }));
    expect(pts.length).toBeGreaterThanOrEqual(5);
    expect(bestFit(pts).cls).toBe(spec.expected[kind]);
  });

  // The same audit for peak memory, for algorithms whose point is the space they use.
  const memCases = MODULES.flatMap((m) =>
    m.algorithms.flatMap((a) =>
      a.expectedMem ? a.inputKinds.map((k) => [a.id, k.id, a.expectedMem![k.id]] as const) : [],
    ),
  );
  it.each(memCases)('%s on %s input uses %s memory', (algoId, kind) => {
    const spec = MODULES.flatMap((m) => m.algorithms).find((a) => a.id === algoId)!;
    const pts = [...benchmark({ algoId, nValues: benchSizes(spec), inputKind: kind, seed: 1 })]
      .filter((p) => !p.truncated)
      .map((p) => ({ n: p.n, y: p.peakMem + p.peakStack }));
    expect(pts.length).toBeGreaterThanOrEqual(5);
    expect(bestFit(pts).cls).toBe(spec.expectedMem![kind]);
  });
});
