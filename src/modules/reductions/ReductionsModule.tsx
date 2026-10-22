import { encodeCircuit } from '../../algorithms/reductions/circuit';
import { graphParam, TABS, useReductionsStore } from '../../store/reductions';
import type { Tab } from '../../store/reductions';
import { useUrlParams } from '../../store/url-state';
import { LectureBar, LectureList } from '../../views/Lecture';
import { GraphReductionTab } from './GraphReductionTab';
import { LECTURE } from './lecture';
import { CircuitTab, CookTab, SudokuTab } from './OtherTabs';
import { QuizTab } from './QuizTab';

const TAB_LABEL: Record<Tab, string> = {
  lecture: 'Lecture',
  coloring: '3-colouring',
  clique: 'k-clique',
  hamiltonian: 'Hamiltonian cycle',
  sudoku: 'Sudoku',
  circuit: 'Circuit → 3-SAT',
  quiz: 'Direction quiz',
  cook: 'Cook–Levin',
};

export default function ReductionsModule() {
  const s = useReductionsStore();
  const { tab, k, omit, size, seed, circuit, machine, lecture } = s;
  const { setTab, setLecture } = useReductionsStore.getState();
  useUrlParams('reductions', {
    tab,
    ...graphParam(s),
    k,
    ...(omit.length ? { omit: omit.join('.') } : {}),
    size,
    seed,
    c: encodeCircuit(circuit),
    tape: machine.input.join(''),
    T: machine.T,
    ls: lecture,
  });
  return (
    <div className="stack">
      <div className="tabs" role="tablist" aria-label="NP-completeness views">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>
      {tab !== 'lecture' && <LectureBar steps={LECTURE} current={lecture} onSelect={setLecture} onBack={() => setTab('lecture')} />}
      <div role="tabpanel" aria-label={TAB_LABEL[tab]}>
        {tab === 'lecture' && (
          <LectureList heading={`A lecture on NP-completeness in ${LECTURE.length} steps`} steps={LECTURE} current={lecture} onSelect={setLecture} />
        )}
        {(tab === 'coloring' || tab === 'clique' || tab === 'hamiltonian') && <GraphReductionTab tab={tab} />}
        {tab === 'sudoku' && <SudokuTab />}
        {tab === 'circuit' && <CircuitTab />}
        {tab === 'quiz' && <QuizTab />}
        {tab === 'cook' && <CookTab />}
      </div>
    </div>
  );
}
