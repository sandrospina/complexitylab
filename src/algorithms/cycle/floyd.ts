import type { Algorithm } from '../../engine/runner';
import type { CycleInput, CycleResult, CycleSnapshot } from './input';

/**
 * Floyd's tortoise and hare: two pointers, one moving one step at a time and one moving
 * two. Inside the loop the hare gains one step per round, so they meet. Restarting the
 * tortoise from x₀ and moving both one step at a time, they meet again exactly at the
 * loop's entrance, after μ steps; going round once more measures λ. O(n) time, O(1) space.
 */
export const cycleFloyd: Algorithm<CycleInput, CycleResult> = function* ({ next, start }, ins) {
  yield ins.alloc<CycleSnapshot>(4, { label: 'tortoise, hare, μ, λ', line: 1 });
  const f = function* (x: number, who: 'tortoise' | 'hare', t: number, h: number) {
    const y = next[x]!;
    yield ins.read<CycleSnapshot>({ indices: [y], label: `${who} steps`, snapshot: who === 'tortoise' ? { tortoise: y, hare: h } : { tortoise: t, hare: y } });
    return y;
  };

  // Phase 1: the hare runs at double speed until they meet inside the loop.
  let t = start;
  let h = start;
  do {
    t = yield* f(t, 'tortoise', t, h);
    h = yield* f(h, 'hare', t, h);
    h = yield* f(h, 'hare', t, h);
    yield ins.compare<CycleSnapshot>({ indices: [t, h], label: 'meet?', snapshot: { tortoise: t, hare: h, phase: 'hare runs at double speed' }, line: 2 });
  } while (t !== h);
  yield ins.mark<CycleSnapshot>('they meet inside the loop', { snapshot: { tortoise: t, hare: h, phase: 'met' } });

  // Phase 2: tortoise back to the start; both at one step: they meet at the loop's entrance.
  let mu = 0;
  t = start;
  ins.at(3);
  for (;;) {
    yield ins.compare<CycleSnapshot>({ indices: [t, h], label: 'meet?', snapshot: { tortoise: t, hare: h, phase: 'finding the entrance' }, line: 4 });
    if (t === h) break;
    ins.at(5);
    t = yield* f(t, 'tortoise', t, h);
    h = yield* f(h, 'hare', t, h);
    mu++;
  }
  yield ins.mark<CycleSnapshot>(`the loop starts after ${mu} steps`, { snapshot: { tortoise: t, hare: h, phase: 'entrance' } });

  // Phase 3: the hare goes round once more to measure the loop.
  let lambda = 0;
  ins.at(6);
  do {
    h = yield* f(h, 'hare', t, h);
    lambda++;
    yield ins.compare<CycleSnapshot>({ indices: [t, h], label: 'back?', snapshot: { tortoise: t, hare: h, phase: 'measuring the loop' }, line: 7 });
  } while (h !== t);
  ins.at(8);
  yield ins.free<CycleSnapshot>(4, { label: 'tortoise, hare, μ, λ' });
  return { mu, lambda };
};
