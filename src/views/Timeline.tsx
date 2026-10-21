import { useEffect, useState } from 'react';

interface Props {
  step: number;
  maxStep: number;
  onStep: (s: number) => void;
}

const SPEEDS = [1, 2, 4, 8, 16];

/** Scrubber driving every view: step 0 is the initial state, step k is after the k-th event. */
export function Timeline({ step, maxStep, onStep }: Props) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(4);
  const running = playing && step < maxStep;

  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => onStep(step + 1), 1000 / speed);
    return () => clearTimeout(id);
  }, [running, step, speed, onStep]);

  const play = () => {
    if (step >= maxStep) onStep(0);
    setPlaying(true);
  };

  return (
    <div className="timeline panel" role="group" aria-label="Timeline">
      <button onClick={() => onStep(0)} disabled={step === 0} aria-label="Back to start">
        ⏮
      </button>
      <button onClick={() => onStep(step - 1)} disabled={step === 0} aria-label="Step back">
        ◀
      </button>
      {running ? (
        <button onClick={() => setPlaying(false)} aria-label="Pause">
          ⏸
        </button>
      ) : (
        <button onClick={play} aria-label="Play">
          ▶
        </button>
      )}
      <button onClick={() => onStep(step + 1)} disabled={step >= maxStep} aria-label="Step forward">
        ▶|
      </button>
      <input
        type="range"
        min={0}
        max={maxStep}
        value={step}
        onChange={(e) => onStep(Number(e.target.value))}
        aria-label="Scrub timeline"
      />
      <span className="mono" data-testid="step-label">
        step {step} / {maxStep}
      </span>
      <label>
        <span className="muted">speed</span>{' '}
        <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Playback speed">
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
