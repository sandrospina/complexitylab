import type { Pseudocode } from './types';

// Line 1 creates the variables; each later line emits one clause family, in the order the
// reduction lists its families (src/algorithms/reductions/types.ts counts clauses per line).
const SOURCES = (file: string) => [`reductions/${file}`, 'reductions/types.ts'];
const NOTE_COUNT = 'The count is the number of clauses this line adds; the formula is exact.';

export const COLORING_TO_SAT: Pseudocode = {
  title: '3-COLOURING-TO-SAT(G)',
  idea: 'Encode "G can be coloured with 3 colours so that no edge joins two vertices of the same colour" as clauses. Variable x(v, c) means vertex v gets colour c.',
  lines: [
    { code: 'create x(v, c) for every vertex v and colour c ∈ {1, 2, 3}', depth: 0, cost: 'c_1', times: '3V', note: 'The variables: 3V of them.' },
    { code: 'for each vertex v: add (x(v,1) ∨ x(v,2) ∨ x(v,3))', depth: 0, unit: 'clauses', cost: 'c_2', times: 'V', note: `Every vertex has a colour. ${NOTE_COUNT}` },
    { code: 'for each vertex v and colours c < d: add (¬x(v,c) ∨ ¬x(v,d))', depth: 0, unit: 'clauses', cost: 'c_3', times: '3V', note: 'No vertex has two colours: one clause per pair of colours.' },
    { code: 'for each edge {u, v} and colour c: add (¬x(u,c) ∨ ¬x(v,c))', depth: 0, unit: 'clauses', cost: 'c_4', times: '3E', note: 'Adjacent vertices differ.' },
  ],
  dominant: [2, 3, 4],
  bound: 'n',
  derivation: [
    {
      label: 'Size of the encoding',
      tex: '\\#\\text{vars} = 3V, \\qquad \\#\\text{clauses} = V + 3V + 3E = 4V + 3E = O(V + E)',
      text: 'Linear in the size of the graph: one constant-size group of clauses per vertex and per edge. A polynomial-size encoding is what makes this a reduction: if SAT were easy, 3-colouring would be easy too.',
    },
  ],
  sources: SOURCES('coloring.ts'),
};

export const CLIQUE_TO_SAT: Pseudocode = {
  title: 'k-CLIQUE-TO-SAT(G, k)',
  idea: 'Encode "G has k pairwise adjacent vertices". Variable x(i, v) means vertex v is the i-th member of the clique.',
  lines: [
    { code: 'create x(i, v) for every slot i ∈ 1..k and vertex v', depth: 0, cost: 'c_1', times: 'kV', note: '' },
    { code: 'for each slot i: add (x(i,1) ∨ … ∨ x(i,V))', depth: 0, unit: 'clauses', cost: 'c_2', times: 'k', note: 'Every slot holds a vertex.' },
    { code: 'for each slot i and vertices u < v: add (¬x(i,u) ∨ ¬x(i,v))', depth: 0, unit: 'clauses', cost: 'c_3', times: 'k\\binom{V}{2}', note: 'No slot holds two vertices.' },
    { code: 'for each vertex v and slots i < j: add (¬x(i,v) ∨ ¬x(j,v))', depth: 0, unit: 'clauses', cost: 'c_4', times: 'V\\binom{k}{2}', note: 'No vertex fills two slots.' },
    { code: 'for each non-edge {u, v} and slots i ≠ j: add (¬x(i,u) ∨ ¬x(j,v))', depth: 0, unit: 'clauses', cost: 'c_5', times: 'k(k-1)\\left(\\binom{V}{2} - E\\right)', note: 'Two non-adjacent vertices are never both in. This family dominates.' },
  ],
  dominant: [2, 3, 4, 5],
  bound: 'n2',
  derivation: [
    {
      label: 'Size of the encoding',
      tex: '\\#\\text{clauses} = k + k\\binom{V}{2} + V\\binom{k}{2} + k(k-1)\\left(\\binom{V}{2} - E\\right) = O(k^2 V^2)',
      text: 'Every non-edge is ruled out for every ordered pair of slots. For fixed k (3 on the scaling plot) that is Θ(V²) on a typical graph: polynomial, but growing with k² as well.',
    },
  ],
  sources: SOURCES('clique.ts'),
};

export const HAMILTONIAN_TO_SAT: Pseudocode = {
  title: 'HAMILTONIAN-CYCLE-TO-SAT(G)',
  idea: 'Encode "the vertices can be ordered in a cycle that uses only edges of G". Variable x(v, p) means vertex v is at position p of the tour.',
  lines: [
    { code: 'create x(v, p) for every vertex v and position p ∈ 1..V', depth: 0, cost: 'c_1', times: 'V^2', note: 'Already V² variables.' },
    { code: 'for each position p: add (x(1,p) ∨ … ∨ x(V,p))', depth: 0, unit: 'clauses', cost: 'c_2', times: 'V', note: 'Every position holds a vertex.' },
    { code: 'for each position p and vertices u < v: add (¬x(u,p) ∨ ¬x(v,p))', depth: 0, unit: 'clauses', cost: 'c_3', times: 'V\\binom{V}{2}', note: 'No position holds two vertices.' },
    { code: 'for each vertex v: add (x(v,1) ∨ … ∨ x(v,V))', depth: 0, unit: 'clauses', cost: 'c_4', times: 'V', note: 'Every vertex is on the tour.' },
    { code: 'for each vertex v and positions p < q: add (¬x(v,p) ∨ ¬x(v,q))', depth: 0, unit: 'clauses', cost: 'c_5', times: 'V\\binom{V}{2}', note: 'No vertex appears twice.' },
    { code: 'for each non-edge {u, v} and position p: add (¬x(u,p) ∨ ¬x(v,p+1)), (¬x(v,p) ∨ ¬x(u,p+1))', depth: 0, unit: 'clauses', cost: 'c_6', times: '2V\\left(\\binom{V}{2} - E\\right)', note: 'Consecutive positions (wrapping round from V to 1) must be joined by an edge.' },
  ],
  dominant: [2, 3, 4, 5, 6],
  bound: 'n3',
  derivation: [
    {
      label: 'Size of the encoding',
      tex: '\\#\\text{clauses} = 2V + 2V\\binom{V}{2} + 2V\\left(\\binom{V}{2} - E\\right) = \\Theta(V^3)',
      text: 'The "exactly one" constraints alone are V · C(V, 2) twice, cubic in V. Polynomial, so still a reduction, but the 10-vertex Petersen graph already needs 1,520 clauses: reductions must stay polynomial, and this one shows how fast polynomial can grow.',
    },
  ],
  sources: SOURCES('hamiltonian.ts'),
};

export const SUDOKU_TO_SAT: Pseudocode = {
  title: 'SUDOKU-TO-SAT(B)',
  idea: 'Encode an s × s puzzle. Variable x(r, c, d) means the cell in row r, column c holds digit d.',
  lines: [
    { code: 'create x(r, c, d) for every cell and digit', depth: 0, cost: 'c_1', times: 's^3', note: '729 for a 9 × 9 board.' },
    { code: 'for each cell: add (x(r,c,1) ∨ … ∨ x(r,c,s))', depth: 0, unit: 'clauses', cost: 'c_2', times: 's^2', note: 'Every cell holds a digit.' },
    { code: 'for each cell and digits d < e: add (¬x(r,c,d) ∨ ¬x(r,c,e))', depth: 0, unit: 'clauses', cost: 'c_3', times: 's^2\\binom{s}{2}', note: 'No cell holds two digits.' },
    { code: 'for each row, digit d and two cells of the row: add (¬x(·,·,d) ∨ ¬x(·,·,d))', depth: 0, unit: 'clauses', cost: 'c_4', times: 's \\cdot s\\binom{s}{2}', note: 'No digit twice in a row.' },
    { code: 'the same for each column', depth: 0, unit: 'clauses', cost: 'c_5', times: 's \\cdot s\\binom{s}{2}', note: '' },
    { code: 'the same for each box', depth: 0, unit: 'clauses', cost: 'c_6', times: 's \\cdot s\\binom{s}{2}', note: '' },
    { code: 'for each given digit d at (r, c): add (x(r,c,d))', depth: 0, unit: 'clauses', cost: 'c_7', times: 'g', note: 'Unit clauses: g givens. DPLL’s propagation starts from these.' },
  ],
  dominant: [2, 3, 4, 5, 6],
  bound: 'n2',
  derivation: [
    {
      label: 'Size of the encoding',
      tex: '\\#\\text{clauses} = s^2 + 4s^2\\binom{s}{2} + g = \\Theta(s^4) = \\Theta(N^2) \\quad (N = s^2 \\text{ cells})',
      text: 'For 9 × 9: 81 + 4 · 81 · 36 = 11,745 clauses, plus the givens. Quadratic in the number of cells, which is the x-axis of the clause counter.',
    },
  ],
  sources: SOURCES('sudoku.ts'),
};

export const TSEITIN: Pseudocode = {
  title: 'TSEITIN(C)',
  idea: 'Encode "some input makes circuit C output true" as 3-CNF. Give every wire a variable, and for each gate add the clauses that say "this wire equals the gate applied to its inputs".',
  lines: [
    { code: 'create a variable for every wire (inputs and gate outputs)', depth: 0, cost: 'c_1', times: '|\\text{wires}|', note: '' },
    { code: 'for each AND gate g = a ∧ b: add (¬g ∨ a), (¬g ∨ b), (g ∨ ¬a ∨ ¬b)', depth: 0, unit: 'clauses', cost: 'c_2', times: '3 \\cdot \\#\\text{AND}', note: 'g true forces a and b; a and b true force g.' },
    { code: 'for each OR gate g = a ∨ b: add (g ∨ ¬a), (g ∨ ¬b), (¬g ∨ a ∨ b)', depth: 0, unit: 'clauses', cost: 'c_3', times: '3 \\cdot \\#\\text{OR}', note: '' },
    { code: 'for each NOT gate g = ¬a: add (g ∨ a), (¬g ∨ ¬a)', depth: 0, unit: 'clauses', cost: 'c_4', times: '2 \\cdot \\#\\text{NOT}', note: '' },
    { code: 'for each XOR gate g = a ⊕ b: add the 4 clauses ruling out the wrong rows', depth: 0, unit: 'clauses', cost: 'c_5', times: '4 \\cdot \\#\\text{XOR}', note: '' },
    { code: 'add (output)', depth: 0, unit: 'clauses', cost: 'c_6', times: '1', note: 'The circuit must output true.' },
  ],
  dominant: [2, 3, 4, 5],
  bound: 'n',
  derivation: [
    {
      label: 'Size of the encoding',
      tex: '\\#\\text{clauses} \\le 4 \\cdot \\#\\text{gates} + 1 = O(|C|), \\qquad \\text{every clause has} \\le 3 \\text{ literals}',
      text: 'Linear in the circuit, and every clause has at most three literals. Any formula can be written as a circuit, so SAT reduces to 3-SAT in linear size: 3-SAT is NP-complete too.',
    },
  ],
  sources: SOURCES('tseitin.ts'),
};

export const COOK_LEVIN: Pseudocode = {
  title: 'TABLEAU-TO-SAT(M, input, T)',
  idea: 'Encode "machine M accepts this input within T steps". Variable x(t, i, σ) means that at time t, tape cell i holds symbol σ (a tape symbol, alone or under the head in a state). The model is the machine’s run, row by row.',
  lines: [
    { code: 'create x(t, i, σ) for every time t ∈ 0..T, cell i and symbol σ', depth: 0, cost: 'c_1', times: '9L(T + 1)', note: 'L cells (input plus a blank), 9 cell symbols.' },
    { code: 'for each t and i: exactly one σ holds', depth: 0, unit: 'clauses', cost: 'c_2', times: '37L(T + 1)', note: 'One clause "some symbol" plus C(9, 2) = 36 "not two symbols" clauses per cell.' },
    { code: 'for each i: add (x(0, i, σᵢ)), the input with the head on cell 1', depth: 0, unit: 'clauses', cost: 'c_3', times: 'L', note: 'Row 0 is the starting configuration.' },
    { code: 'for each t < T, i and window (left, cell): add (¬x(t,i−1,left) ∨ ¬x(t,i,cell) ∨ x(t+1,i,next))', depth: 0, unit: 'clauses', cost: 'c_4', times: 'T\\,(9 + 81(L - 1))', note: 'Each cell at time t + 1 follows from its 2-cell window at time t by the machine’s rule. Real tableaux use 2 × 3 windows; this machine only moves right.' },
    { code: 'add (some x(t, i, accept σ))', depth: 0, unit: 'clauses', cost: 'c_5', times: '1', note: 'The machine accepts at some time.' },
  ],
  dominant: [2, 4],
  bound: 'n',
  derivation: [
    {
      label: 'Size of the encoding',
      tex: '\\#\\text{clauses} = 37L(T+1) + L + T(9 + 81(L-1)) + 1 = \\Theta(L \\cdot T)',
      text: 'Linear in T for a fixed tape. For a machine checking a certificate in time p(n), the tape needs at most p(n) cells, so the tableau has p(n)² cells and polynomially many clauses: any NP problem reduces to SAT. That is the Cook–Levin theorem, and why SAT was the first NP-complete problem.',
    },
  ],
  sources: SOURCES('cook-levin.ts'),
};
