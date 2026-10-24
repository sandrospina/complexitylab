import { CYCLE_KINDS } from '../algorithms/cycle/input';
import { createRaceTabStore } from './race-tab';

export const CYCLE_ALGOS = ['cycle-hash', 'cycle-floyd'] as const;
export type CycleAlgo = (typeof CYCLE_ALGOS)[number];
export const MAX_CYCLE_N = 40;

export const useCycleStore = createRaceTabStore({
  algos: CYCLE_ALGOS,
  kinds: CYCLE_KINDS.map((k) => k.id),
  prefix: 'c',
  n: 14,
  maxN: MAX_CYCLE_N,
  kind: 'balanced',
});
