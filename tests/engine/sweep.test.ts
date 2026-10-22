import { describe, expect, it } from 'vitest';
import { sweep } from '../../src/engine/benchmark-core';

const RATIOS = Array.from({ length: 21 }, (_, i) => 2 + 0.25 * i);

describe('phase-transition sweep', () => {
  it('random 3-SAT goes from satisfiable to unsatisfiable, and is hardest, near ratio 4.26', () => {
    const pts = [...sweep({ algoId: 'sat/dpll-jw', n: 40, inputKind: 'threshold', params: RATIOS, trials: 64, seed: 1 })];
    expect(pts.map((p) => p.param)).toEqual(RATIOS);
    expect(pts[0]!.success).toBeGreaterThan(0.95);
    expect(pts.at(-1)!.success).toBeLessThan(0.05);
    // The ratio where satisfiability crosses 50 %, interpolated. At 40 variables it sits a little above 4.26.
    const i = pts.findIndex((p) => p.success < 0.5);
    const [a, b] = [pts[i - 1]!, pts[i]!];
    const crossing = a.param + ((a.success - 0.5) / (a.success - b.success)) * (b.param - a.param);
    expect(crossing).toBeGreaterThan(3.8);
    expect(crossing).toBeLessThan(5.0);
    // Search effort is counted in decisions (search-tree nodes); total ops also grow with the
    // number of clauses each propagation pass visits, which keeps rising past the threshold.
    const peak = pts.reduce((m, p) => (p.medianDecisions > m.medianDecisions ? p : m));
    expect(peak.param).toBeGreaterThanOrEqual(3.8);
    expect(peak.param).toBeLessThanOrEqual(5.0);
  }, 60_000);
});
