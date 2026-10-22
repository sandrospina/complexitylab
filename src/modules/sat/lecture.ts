import { useSatStore } from '../../store/sat';

export interface LectureStep {
  title: string;
  text: string;
  /** What the "Show me" button sets up. */
  show: () => void;
}

const store = () => useSatStore.getState();
const workspace = (patch: Parameters<ReturnType<typeof store>['configure']>[0]) => {
  store().configure(patch);
  store().setTab('workspace');
};

// The order of a 50-minute lecture: what SAT is, the naive solver, its wall, then what DPLL
// adds piece by piece, and finally where random formulas are hard.
export const LECTURE: LectureStep[] = [
  {
    title: 'Formulas in CNF',
    text: 'A formula in conjunctive normal form is an AND of clauses, each an OR of literals: a variable or its negation. It is satisfiable if some true/false assignment makes every clause true. Click a literal chip to negate it and watch the clause colours change as the solver assigns variables.',
    show: () => {
      store().loadPreset('example');
      workspace({ heuristic: 'first', propagate: true, pure: false });
    },
  },
  {
    title: 'The truth table',
    text: 'The naive solver tries every assignment: 2ⁿ rows, each checked clause by clause until one fails. This formula over 3 variables is unsatisfiable, so all 8 rows fail; the heat strip shows which clause rules each row out. Its cost depends on n, not on how the clauses are built.',
    show: () => {
      store().loadPreset('core');
      workspace({ heuristic: 'first', propagate: true, pure: false });
    },
  },
  {
    title: 'The 2ⁿ wall',
    text: 'Run the scaling experiment. The truth table doubles with every variable and stops near 20. The other curves are the search solvers you are about to meet: still exponential in the worst case, but reaching four times as many variables.',
    show: () => {
      store().setTab('experiments');
      store().runScaling();
    },
  },
  {
    title: 'Search: decide and backtrack',
    text: 'Instead of fixing all variables and then checking, search fixes one variable at a time and checks clauses as it goes: as soon as a clause is falsified, it undoes the last decision and tries the other value. Each node of the tree is a decision; red nodes ended in a conflict. Here: 3 pigeons in 2 holes, impossible, without unit propagation.',
    show: () => {
      store().loadPreset('php3');
      workspace({ heuristic: 'first', propagate: false, pure: false });
    },
  },
  {
    title: 'Unit propagation',
    text: 'When all but one literal of a clause is false, the last one is forced: no need to guess it. With unit propagation on (this is DPLL), the same refutation needs far fewer decisions; the trail shows each forced literal and the clause that forced it. Toggle it off and on to compare the trees.',
    show: () => {
      store().loadPreset('php3');
      workspace({ heuristic: 'first', propagate: true, pure: false });
    },
  },
  {
    title: 'Choosing what to decide',
    text: 'Which variable to branch on matters. MOMS prefers variables in the shortest open clauses; Jeroslow–Wang weighs every clause by 2^−size, so short clauses count most. The shoot-out runs all three heuristics on the same 64 random formulas and ranks them.',
    show: () => {
      store().setTab('experiments');
      store().runShootout();
    },
  },
  {
    title: 'The phase transition',
    text: 'Random 3-SAT formulas change character with the ratio of clauses to variables. With few clauses nearly all are satisfiable, with many nearly none are; the switch happens near 4.26, and that is where the solver works hardest. Easy-hard-easy: hardness is a property of the instance, not just of the problem.',
    show: () => {
      store().setTab('experiments');
      store().runPhase();
    },
  },
];
