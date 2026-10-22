import { useSatStore } from '../../store/sat';
import { LECTURE } from './lecture';

/** The SAT lecture: ordered steps, each loading its formula and settings into the module. */
export function LectureTab() {
  const { lecture } = useSatStore();
  const { setLecture } = useSatStore.getState();
  return (
    <section className="panel stack" aria-label="Lecture">
      <h2>A lecture on SAT in {LECTURE.length} steps</h2>
      <ol className="lecture">
        {LECTURE.map((s, i) => (
          <li key={s.title} className={i === lecture ? 'current' : undefined} aria-current={i === lecture ? 'step' : undefined}>
            <strong>{s.title}</strong>
            <p>{s.text}</p>
            <button
              className={i === lecture ? 'primary' : undefined}
              onClick={() => {
                setLecture(i);
                s.show();
              }}
              aria-label={`Show me: ${s.title}`}
            >
              Show me
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** A reminder of the lecture step on the other tabs, with a way on. */
export function LectureBar() {
  const { lecture } = useSatStore();
  const { setLecture, setTab } = useSatStore.getState();
  const step = LECTURE[lecture]!;
  const next = LECTURE[lecture + 1];
  return (
    <div className="panel controls lecture-bar" aria-label="Lecture progress">
      <span>
        Lecture step {lecture + 1} of {LECTURE.length}: <strong>{step.title}</strong>
      </span>
      <button onClick={() => setTab('lecture')}>Back to the lecture</button>
      {next && (
        <button
          className="primary"
          onClick={() => {
            setLecture(lecture + 1);
            next.show();
          }}
        >
          Next: {next.title}
        </button>
      )}
    </div>
  );
}
