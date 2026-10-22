import { useReductionsStore } from '../../store/reductions';
import type { Tab } from '../../store/reductions';
import type { LectureStep } from '../../views/Lecture';

const store = () => useReductionsStore.getState();
const go = (tab: Tab) => store().setTab(tab);

// A 50-minute lecture on NP-completeness: what a reduction is and which way it goes, one
// reduction end to end, why size and every clause family matter, then the classic
// reductions, 3-SAT, and why SAT came first.
export const LECTURE: LectureStep[] = [
  {
    title: 'What a reduction is',
    text: 'A reduction from A to B turns any instance of A into an instance of B with the same yes/no answer, in polynomial time. Then a fast algorithm for B gives a fast one for A: B is at least as hard. The direction is everything, so start with the quiz.',
    show: () => go('quiz'),
  },
  {
    title: '3-colouring, end to end',
    text: 'Encode a graph as clauses: x(v, c) means vertex v gets colour c. Every vertex gets a colour, at most one, and the ends of each edge differ. DPLL solves the CNF and the model is decoded back onto the graph. Hover a clause to see which vertex or edge it is about.',
    show: () => {
      store().loadPreset('square');
      go('coloring');
    },
  },
  {
    title: 'The size must stay polynomial',
    text: 'A reduction is only useful if the encoding is small. The clause counter shows exactly what one more vertex or edge adds, and fitting the growth over many graphs gives a polynomial: linear in V + E for 3-colouring.',
    show: () => {
      go('coloring');
      store().runCounter('reductions/coloring');
    },
  },
  {
    title: 'Break it',
    text: 'Every clause family is there for a reason. K₄ needs four colours, so its encoding is unsatisfiable. Untick "adjacent vertices differ": now the formula is satisfiable, and the decoder flags the edges whose ends share a colour.',
    show: () => {
      store().loadPreset('k4');
      go('coloring');
      store().setOmit(['differ']);
    },
  },
  {
    title: 'k-clique: growth with k',
    text: 'x(i, v): vertex v is the i-th member of the clique. Every non-edge must be ruled out for every pair of slots, so the clauses grow with k² · V². Move the k slider and watch the counter.',
    show: () => {
      store().loadPreset('random');
      store().setK(3);
      go('clique');
    },
  },
  {
    title: 'Hamiltonian cycle: a large blow-up',
    text: 'x(v, p): vertex v is at position p of the tour. That is V² variables and O(V³) clauses: still polynomial, but already 1,520 clauses for the 10-vertex Petersen graph. It has no Hamiltonian cycle, and proving that takes DPLL thousands of decisions: an unsatisfiable answer needs the whole search.',
    show: () => {
      store().loadPreset('petersen');
      go('hamiltonian');
    },
  },
  {
    title: 'Sudoku: mostly propagation',
    text: 'x(r, c, d): the cell holds digit d. A 9 × 9 puzzle is 729 variables and about 12,000 clauses, yet DPLL needs only a couple of dozen decisions against hundreds of propagations: unit propagation does almost everything, like the human "only one digit fits here".',
    show: () => {
      store().setPuzzle('9', 1);
      go('sudoku');
    },
  },
  {
    title: 'Circuits → 3-SAT',
    text: 'Tseitin gives every wire a variable and writes each gate as 2 to 4 clauses of at most 3 literals. Any circuit (and any formula) becomes 3-CNF of linear size: SAT reduces to 3-SAT, so 3-SAT is NP-complete too.',
    show: () => go('circuit'),
  },
  {
    title: 'Cook–Levin: why SAT came first',
    text: 'Why is SAT hard at all? Any NP problem has a polynomial-time checker; write the checker’s whole run as a tableau, and "the checker accepts" becomes clauses about the cells. With too few steps the formula is unsatisfiable; with enough, the model is the run itself, and DPLL finds it by propagation alone, row by row, without a single decision.',
    show: () => go('cook'),
  },
];
