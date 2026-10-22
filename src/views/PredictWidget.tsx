import { CLASS_LABEL, COMPLEXITY_CLASSES } from '../engine/complexity';
import type { ComplexityClass } from '../engine/complexity';

const grows = (c: ComplexityClass) => COMPLEXITY_CLASSES.indexOf(c);
const EXPONENTIAL: ReadonlySet<ComplexityClass> = new Set(['expc', 'expPhi', 'exp2']);
/** O(cⁿ) names no base, so it is a right answer for any exponential. */
const matches = (value: ComplexityClass, measured: ComplexityClass) =>
  value === measured || (value === 'expc' && EXPONENTIAL.has(measured));

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
        <p className={`verdict ${value !== undefined && matches(value, measured) ? 'ok' : 'bad'}`} style={{ margin: 0 }} role="status">
          Measured {CLASS_LABEL[measured]}.{' '}
          {value === undefined
            ? 'You did not predict this one.'
            : matches(value, measured)
              ? 'Your prediction was right.'
              : grows(value) > grows(measured)
                ? `You predicted ${CLASS_LABEL[value]}: a valid upper bound, but not tight.`
                : `You predicted ${CLASS_LABEL[value]}.`}
        </p>
      )}
    </fieldset>
  );
}
