import { describe, expect, it } from 'vitest';
import { BudgetExceeded, Instrument } from '../../src/engine/instrument';
import { runCount, runTrace } from '../../src/engine/runner';
import type { Algorithm } from '../../src/engine/runner';
import type { TraceEvent } from '../../src/engine/events';
import { buildCallTree, levelSums } from '../../src/engine/calltree';

// Touches every element once, with one frame and a scratch cell, so all counter kinds move.
const scan: Algorithm<number[], number> = function* (arr, ins) {
  yield ins.pushFrame({ label: 'scan' });
  yield ins.alloc(1);
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    yield ins.read({ indices: [i] });
    sum += arr[i]!;
  }
  yield ins.free(1);
  yield ins.popFrame();
  return sum;
};

describe('runner', () => {
  it('trace and count modes produce identical counters and result', () => {
    const input = [1, 2, 3, 4, 5];
    const trace = runTrace(scan, input);
    const count = runCount(scan, input);
    expect(trace.result).toBe(15);
    expect(count.result).toBe(15);
    expect(trace.counters).toEqual(count.counters);
    expect(count.counters.ops.read).toBe(5);
    expect(count.counters.peakMem).toBe(1);
    expect(count.counters.peakStack).toBe(1);
    expect(count.counters.memCells).toBe(0);
    expect(count.counters.stackDepth).toBe(0);
  });

  it('records one step per yielded event with the counters at that instant', () => {
    const trace = runTrace(scan, [7, 8]);
    expect(trace.steps.map((s) => s.event.op)).toEqual([
      'pushFrame',
      'alloc',
      'read',
      'read',
      'free',
      'popFrame',
    ]);
    expect(trace.steps[1]!.counters.memCells).toBe(1);
    expect(trace.steps[3]!.counters.ops.read).toBe(2);
    expect(trace.steps[5]!.counters.stackDepth).toBe(0);
  });

  it('stops cleanly when the op budget is exhausted', () => {
    const count = runCount(scan, new Array(100).fill(1), { budget: { maxOps: 10 } });
    expect(count.truncated).toBe(true);
    expect(count.result).toBeUndefined();
    expect(count.counters.totalOps).toBe(10);
  });

  it('caps the number of stored trace steps', () => {
    const trace = runTrace(scan, new Array(100).fill(1), { maxSteps: 20 });
    expect(trace.truncated).toBe(true);
    expect(trace.steps).toHaveLength(20);
  });

  it('throws BudgetExceeded from the instrument directly', () => {
    const ins = new Instrument({ maxOps: 1 });
    ins.compare();
    expect(() => ins.compare()).toThrow(BudgetExceeded);
  });
});

describe('frames', () => {
  // A tiny recursive algorithm: f(k) calls f(k - 1) twice, and does one compare per call.
  const tree: Algorithm<number, void> = function* (k, ins) {
    function* f(d: number): Generator<TraceEvent, void, void> {
      yield ins.pushFrame({ label: `f(${d})`, value: d });
      yield ins.compare();
      if (d > 0) {
        yield* f(d - 1);
        yield* f(d - 1);
      }
      yield ins.popFrame();
    }
    yield* f(k);
  };

  it('stamps pushFrame with ids and parents, and counted ops with the current frame', () => {
    const { steps } = runTrace(tree, 1);
    const pushes = steps.filter((s) => s.event.op === 'pushFrame').map((s) => s.event);
    expect(pushes.map((e) => [e.frame, e.parentFrame])).toEqual([[0, undefined], [1, 0], [2, 0]]);
    const compares = steps.filter((s) => s.event.op === 'compare').map((s) => s.event.frame);
    expect(compares).toEqual([0, 1, 2]);
  });

  it('builds a call tree with per-level own costs', () => {
    const { steps } = runTrace(tree, 3);
    const nodes = buildCallTree(steps);
    expect(nodes).toHaveLength(15);
    expect(nodes[0]).toMatchObject({ parent: undefined, depth: 0, label: 'f(3)', size: 3, ownOps: 1 });
    expect(levelSums(nodes)).toEqual([1, 2, 4, 8]);
    expect(nodes.every((n) => n.endStep !== undefined && n.endStep > n.startStep)).toBe(true);
  });
});
