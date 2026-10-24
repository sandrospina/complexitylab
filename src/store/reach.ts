import { REACH_KINDS } from '../algorithms/reach/input';
import { createRaceTabStore } from './race-tab';

export const REACH_ALGOS = ['reach-bfs', 'reach-savitch'] as const;
export type ReachAlgo = (typeof REACH_ALGOS)[number];
export const MAX_REACH_N = 8;

export const useReachStore = createRaceTabStore({
  algos: REACH_ALGOS,
  kinds: REACH_KINDS.map((k) => k.id),
  prefix: 'r',
  n: 6,
  maxN: MAX_REACH_N,
  kind: 'path',
});
