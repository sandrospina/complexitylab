import { QBF_KINDS } from '../algorithms/qbf/input';
import { createRaceTabStore } from './race-tab';

export const QBF_ALGOS = ['qbf-recursive', 'qbf-table'] as const;
export type QbfAlgo = (typeof QBF_ALGOS)[number];
export const MAX_QBF_N = 6;

export const useQbfStore = createRaceTabStore({
  algos: QBF_ALGOS,
  kinds: QBF_KINDS.map((k) => k.id),
  prefix: 'q',
  n: 4,
  maxN: MAX_QBF_N,
  kind: 'alternating',
});
