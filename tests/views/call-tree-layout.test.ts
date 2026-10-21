import { describe, expect, it } from 'vitest';
import { fibMemo, fibNaive } from '../../src/algorithms/fib/recursive';
import { buildCallTree } from '../../src/engine/calltree';
import { runTrace } from '../../src/engine/runner';
import { layoutCallTree } from '../../src/views/call-tree-layout';

const tree = (algo: typeof fibNaive, n: number) => layoutCallTree(buildCallTree(runTrace(algo, { n }).steps));

describe('call-tree layout', () => {
  it('spaces leaves evenly and centres parents over their children', () => {
    const { placed, leaves, depth } = tree(fibNaive, 5);
    expect(leaves).toBe(8);
    expect(depth).toBe(5);
    expect(placed.filter((p) => p.leaf).map((p) => p.x)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    const byKey = new Map(placed.map((p) => [p.key, p]));
    for (const p of placed) {
      const kids = placed.filter((c) => c.parentKey === p.key);
      if (kids.length) expect(p.x).toBe((kids[0]!.x + kids.at(-1)!.x) / 2);
      if (p.parentKey !== undefined) expect(byKey.get(p.parentKey)!.y).toBe(p.y - 1);
    }
  });

  it('keys every memo call to the same call in the naive tree', () => {
    const naive = new Map(tree(fibNaive, 8).placed.map((p) => [p.key, p.node.label]));
    const memo = tree(fibMemo, 8).placed;
    for (const p of memo) expect(naive.get(p.key)).toBe(p.node.label);
    // Memo hits are leaves in the memo tree but internal in the naive one.
    const internal = new Set(tree(fibNaive, 8).placed.filter((p) => !p.leaf).map((p) => p.key));
    expect(memo.filter((p) => p.leaf && internal.has(p.key)).map((p) => p.node.label)).toEqual([
      'fib(2)', 'fib(3)', 'fib(4)', 'fib(5)', 'fib(6)',
    ]);
  });
});
