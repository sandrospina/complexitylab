/** The guesses binary search makes to find `secret` in 1..max. */
export function binaryGuesses(max: number, secret: number): number[] {
  const guesses: number[] = [];
  let lo = 1;
  let hi = max;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    guesses.push(mid);
    if (mid === secret) break;
    if (mid < secret) lo = mid + 1;
    else hi = mid - 1;
  }
  return guesses;
}

/** Worst-case number of guesses binary search needs for 1..max. */
export const optimalGuesses = (max: number) => Math.ceil(Math.log2(max + 1));
