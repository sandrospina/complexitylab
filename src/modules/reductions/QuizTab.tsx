import { useState } from 'react';
import { useReductionsStore } from '../../store/reductions';

interface Question {
  goal: string;
  left: string;
  right: string;
  /** Whether the arrow should point left → right. */
  rightward: boolean;
  why: string;
}

export const QUESTIONS: Question[] = [
  {
    goal: 'You want to prove that 3-colouring is NP-hard. 3-SAT is known to be NP-hard.',
    left: '3-SAT',
    right: '3-colouring',
    rightward: true,
    why: 'Reduce the known hard problem to the new one: if 3-colouring were easy, the reduction would make 3-SAT easy too.',
  },
  {
    goal: 'You want to solve Sudoku puzzles with an off-the-shelf SAT solver.',
    left: 'SAT',
    right: 'Sudoku',
    rightward: false,
    why: 'To use a solver for B on problem A, reduce A to B: encode the puzzle as clauses, as the Sudoku tab does.',
  },
  {
    goal: 'You want to prove that TSP (is there a tour of length ≤ L?) is NP-hard. Hamiltonian cycle is known to be NP-hard.',
    left: 'Hamiltonian cycle',
    right: 'TSP',
    rightward: true,
    why: 'Give edges weight 1 and non-edges weight 2: a tour of length V exists exactly when a Hamiltonian cycle does.',
  },
  {
    goal: 'You show that k-clique reduces to SAT. What have you proved?',
    left: 'k-clique',
    right: 'SAT',
    rightward: true,
    why: 'k-clique → SAT proves only that k-clique is in NP (it is no harder than SAT). Hardness needs a reduction from a hard problem into k-clique.',
  },
  {
    goal: 'You want to prove that SAT is no harder than 3-SAT, so 3-SAT is NP-complete too.',
    left: '3-SAT',
    right: 'Circuit-SAT / SAT',
    rightward: false,
    why: 'Tseitin turns any formula or circuit into 3-CNF of linear size: SAT → 3-SAT, so 3-SAT is at least as hard.',
  },
];

/** "Which way does the reduction go?" with an arrow the student flips. */
export function QuizTab() {
  const { quiz } = useReductionsStore();
  const { answer } = useReductionsStore.getState();
  const [arrows, setArrows] = useState<boolean[]>(QUESTIONS.map(() => true));
  const answered = Object.keys(quiz).length;
  const score = Object.values(quiz).filter(Boolean).length;
  return (
    <section className="panel stack" aria-label="Direction quiz">
      <h2>Which way does the reduction go?</h2>
      <p style={{ margin: 0 }}>
        A reduction A → B turns any instance of A into an instance of B with the same answer, in polynomial time. So B is
        at least as hard as A. Flip each arrow, then check.
      </p>
      <ol className="quiz">
        {QUESTIONS.map((q, i) => (
          <li key={i} className="stack" style={{ gap: 6 }}>
            <span>{q.goal}</span>
            <div className="controls">
              <span className="quiz-box">{q.left}</span>
              <button
                className="mono quiz-arrow"
                onClick={() => setArrows(arrows.map((a, j) => (j === i ? !a : a)))}
                aria-label={`Question ${i + 1}: the reduction goes ${arrows[i] ? `${q.left} to ${q.right}` : `${q.right} to ${q.left}`}; flip it`}
              >
                {arrows[i] ? '——→' : '←——'}
              </button>
              <span className="quiz-box">{q.right}</span>
              <button onClick={() => answer(i, arrows[i] === q.rightward)}>Check</button>
              {quiz[i] !== undefined && (
                <strong className={quiz[i] ? 'status-ok' : 'error-text'} data-testid={`quiz-${i + 1}`}>
                  {quiz[i] ? 'Right.' : 'Not quite.'}
                </strong>
              )}
            </div>
            {quiz[i] !== undefined && <span className="muted">{q.why}</span>}
          </li>
        ))}
      </ol>
      <p style={{ margin: 0 }} data-testid="quiz-score">
        Score: {score} of {answered} checked ({QUESTIONS.length} questions).
      </p>
    </section>
  );
}
