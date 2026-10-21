import { CLASS_LABEL, COMPLEXITY_CLASSES } from '../engine/complexity';
import type { ComplexityClass } from '../engine/complexity';

interface Props {
  algorithm: string;
  value?: ComplexityClass;
  onChange: (c: ComplexityClass) => void;
  /** Best-fit class once the scaling run has finished. */
  measured?: ComplexityClass;
  disabled?: boolean;
}

/** Student commits to a growth class before the scaling run reveals the measured one. */
export function PredictWidget({ algorithm, value, onChange, measured, disabled }: Props) {
  const name = `predict-${algorithm}`;
  return (
    <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0, gap: 6 }} disabled={disabled}>
      <legend>
        How will <strong>{algorithm}</strong> grow?
      </legend>
      <div className="predict">
        {COMPLEXITY_CLASSES.map((c) => (
          <label key={c}>
            <input type="radio" name={name} checked={value === c} onChange={() => onChange(c)} />
            {CLASS_LABEL[c]}
          </label>
        ))}
      </div>
      {measured && (
        <p className={`verdict ${value === measured ? 'ok' : 'bad'}`} style={{ margin: 0 }} role="status">
          Measured {CLASS_LABEL[measured]}.{' '}
          {value === undefined
            ? 'You did not predict this one.'
            : value === measured
              ? 'Your prediction was right.'
              : `You predicted ${CLASS_LABEL[value]}.`}
        </p>
      )}
    </fieldset>
  );
}
