import { useState } from 'react';
import { binaryGuesses, optimalGuesses } from './guess';

const RANGES = [100, 1000, 1_000_000];

/** "Guess my number": the student plays, then compares with binary search's guesses. */
export function GuessGame() {
  const [max, setMax] = useState(100);
  const [secret, setSecret] = useState(() => 1 + Math.floor(Math.random() * 100));
  const [guesses, setGuesses] = useState<number[]>([]);
  const [input, setInput] = useState('');
  const [showBinary, setShowBinary] = useState(false);

  const last = guesses.at(-1);
  const won = last === secret;
  const restart = (m: number) => {
    setMax(m);
    setSecret(1 + Math.floor(Math.random() * m));
    setGuesses([]);
    setInput('');
    setShowBinary(false);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const g = Number.parseInt(input, 10);
    if (!Number.isFinite(g) || g < 1 || g > max || won) return;
    setGuesses([...guesses, g]);
    setInput('');
  };

  return (
    <section className="panel stack" aria-label="Guess my number">
      <h2>Guess my number</h2>
      <div className="controls">
        <label>
          Range 1 to
          <select value={max} onChange={(e) => restart(Number(e.target.value))} aria-label="Range">
            {RANGES.map((r) => (
              <option key={r} value={r}>
                {r.toLocaleString()}
              </option>
            ))}
          </select>
        </label>
        <span className="muted">Binary search never needs more than {optimalGuesses(max)} guesses.</span>
      </div>
      <form className="controls" onSubmit={submit}>
        <input
          type="number"
          min={1}
          max={max}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Your guess"
          disabled={won}
        />
        <button type="submit" disabled={won}>
          Guess
        </button>
        <span role="status">
          {last === undefined
            ? 'Make a guess.'
            : won
              ? `Found it in ${guesses.length} guess${guesses.length === 1 ? '' : 'es'}!`
              : `${last} is too ${last < secret ? 'low' : 'high'}. Guesses: ${guesses.length}`}
        </span>
      </form>
      {won && (
        <div className="controls">
          <button onClick={() => setShowBinary(true)}>Show how binary search would play</button>
          <button onClick={() => restart(max)}>Play again</button>
        </div>
      )}
      {showBinary && (
        <p className="mono" style={{ margin: 0 }}>
          {binaryGuesses(max, secret).join(' → ')} ({binaryGuesses(max, secret).length} guesses)
        </p>
      )}
    </section>
  );
}
