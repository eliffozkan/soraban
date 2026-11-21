/** Initial proposal; confirm before launch. Applies to answer and guess. */
export const DEFAULT_MAX_VALUE = 1e15;

/** Pure scoring; parsing and display rounding belong at the UI boundary. */
export function scoreGuess(answer: number, guess: number, maximum = DEFAULT_MAX_VALUE): number {
  if (!Number.isFinite(maximum) || maximum <= 0) {
    throw new RangeError("Maximum must be positive and finite.");
  }
  for (const value of [answer, guess]) {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > maximum) {
      throw new RangeError("Answer and guess must be positive finite numbers within the maximum.");
    }
  }
  // An overflowing ratio is already far beyond the zero-score threshold.
  const ratio = Math.max(answer, guess) / Math.min(answer, guess);
  return Math.max(0, 100 - 50 * Math.log10(ratio));
}
