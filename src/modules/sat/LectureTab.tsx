import { useSatStore } from '../../store/sat';
import { LectureBar as Bar, LectureList } from '../../views/Lecture';
import { LECTURE } from './lecture';

export function LectureTab() {
  const { lecture } = useSatStore();
  return <LectureList heading={`A lecture on SAT in ${LECTURE.length} steps`} steps={LECTURE} current={lecture} onSelect={useSatStore.getState().setLecture} />;
}

export function LectureBar() {
  const { lecture } = useSatStore();
  const { setLecture, setTab } = useSatStore.getState();
  return <Bar steps={LECTURE} current={lecture} onSelect={setLecture} onBack={() => setTab('lecture')} />;
}
