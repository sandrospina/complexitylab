import { LCS_KINDS } from '../algorithms/lcs/input';
import { createRaceTabStore } from './race-tab';

export const LCS_ALGOS = ['lcs-table', 'lcs-rows', 'lcs-hirschberg'] as const;
export type LcsAlgo = (typeof LCS_ALGOS)[number];
export const MAX_LCS_N = 14;

export const useLcsStore = createRaceTabStore({
  algos: LCS_ALGOS,
  kinds: LCS_KINDS.map((k) => k.id),
  prefix: 'l',
  n: 10,
  maxN: MAX_LCS_N,
  kind: 'random',
});
