import { CLASS_LABEL, FIXED_CLASSES } from '../../engine/complexity';
import { intParam, useUrlParams } from '../../store/url-state';
import { useState } from 'react';
import { formatWall, largestN, SECONDS } from './wall';

const SPEEDS = [6, 9, 12];
const COLUMNS: { key: keyof typeof SECONDS; label: string }[] = [
  { key: 'second', label: '1 second' },
  { key: 'day', label: '1 day' },
  { key: 'universe', label: 'Age of the universe' },
];

/** Largest solvable n per complexity class for three time budgets. */
export default function GrowthWallModule() {
  const [exp, setExp] = useState(() => intParam('ops', 9, 3, 18));
  useUrlParams('growth-wall', { ops: exp });
  const opsPerSecond = 10 ** exp;

  return (
    <section className="panel stack" aria-label="Growth-rate wall">
      <h2>Growth-rate wall</h2>
      <p style={{ margin: 0 }}>
        The largest input each class can handle when the computer does{' '}
        <label>
          <select value={exp} onChange={(e) => setExp(Number(e.target.value))} aria-label="Operations per second">
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                10^{s}
              </option>
            ))}
          </select>
        </label>{' '}
        operations per second. Watch the bottom rows: a billion times more time barely moves them.
      </p>
      <div className="table-scroll">
        <table className="wall">
          <thead>
            <tr>
              <th scope="col">Class</th>
              {COLUMNS.map((c) => (
                <th key={c.key} scope="col">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FIXED_CLASSES.map((cls) => (
              <tr key={cls}>
                <th scope="row">{CLASS_LABEL[cls]}</th>
                {COLUMNS.map((c) => (
                  <td key={c.key} className="mono" data-testid={`wall-${cls}-${c.key}`}>
                    {formatWall(largestN(cls, opsPerSecond * SECONDS[c.key]))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
