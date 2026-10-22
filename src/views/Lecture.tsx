export interface LectureStep {
  title: string;
  text: string;
  /** What the "Show me" button sets up: state, tab, experiments. */
  show: () => void;
}

interface ListProps {
  heading: string;
  steps: LectureStep[];
  current: number;
  onSelect: (i: number) => void;
}

/** A lecture as ordered steps, each a paragraph and a button that loads its state into the module. */
export function LectureList({ heading, steps, current, onSelect }: ListProps) {
  return (
    <section className="panel stack" aria-label="Lecture">
      <h2>{heading}</h2>
      <ol className="lecture">
        {steps.map((s, i) => (
          <li key={s.title} className={i === current ? 'current' : undefined} aria-current={i === current ? 'step' : undefined}>
            <strong>{s.title}</strong>
            <p>{s.text}</p>
            <button
              className={i === current ? 'primary' : undefined}
              onClick={() => {
                onSelect(i);
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

interface BarProps {
  steps: LectureStep[];
  current: number;
  onSelect: (i: number) => void;
  onBack: () => void;
}

/** The current lecture step, shown on a module's other tabs, with a way on. */
export function LectureBar({ steps, current, onSelect, onBack }: BarProps) {
  const step = steps[current]!;
  const next = steps[current + 1];
  return (
    <div className="panel controls lecture-bar" aria-label="Lecture progress">
      <span>
        Lecture step {current + 1} of {steps.length}: <strong>{step.title}</strong>
      </span>
      <button onClick={onBack}>Back to the lecture</button>
      {next && (
        <button
          className="primary"
          onClick={() => {
            onSelect(current + 1);
            next.show();
          }}
        >
          Next: {next.title}
        </button>
      )}
    </div>
  );
}
