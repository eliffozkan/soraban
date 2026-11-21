import { describe, expect, it } from "vitest";
import { DEFAULT_MAX_VALUE, scoreGuess } from "../../lib/game/scoring";

describe("scoreGuess", () => {
  it.each([
    [1, 100], [2, 84.94850021680094], [3, 76.14393726401688],
    [10, 50], [30, 26.143937264016884], [100, 0], [1000, 0],
  ])("scores a %sx estimate", (factor, expected) => {
    expect(scoreGuess(100, 100 * factor)).toBeCloseTo(expected, 12);
  });
  it.each([NaN, Infinity, -Infinity, 0, -0, -1, DEFAULT_MAX_VALUE + 1])(
    "rejects invalid answer or guess %s", (value) => {
      expect(() => scoreGuess(value, 1)).toThrow(RangeError);
      expect(() => scoreGuess(1, value)).toThrow(RangeError);
    },
  );
  it("does not coerce untrusted input", () => {
    for (const value of ["100", null, undefined, true, {}, []]) {
      expect(() => scoreGuess(100, value as number)).toThrow(RangeError);
      expect(() => scoreGuess(value as number, 100)).toThrow(RangeError);
    }
  });
  it.each([[100, 200], [0.1, 30], [123.456, 789.123], [1e-300, 1e15]])(
    "is symmetric for %s and %s", (a, b) => {
      expect(scoreGuess(a, b)).toBe(scoreGuess(b, a));
    },
  );
  it("preserves raw precision for aggregation and tie breaking", () => {
    const score = scoreGuess(100, 200);
    expect(score).toBe(100 - 50 * Math.log10(2));
    expect(score).not.toBe(Number(score.toFixed(2)));
    expect(scoreGuess(100, 200.000001)).toBeLessThan(score);
  });
  it("accepts fractions, the maximum, and extreme finite inputs", () => {
    expect(scoreGuess(0.5, 0.5)).toBe(100);
    expect(scoreGuess(DEFAULT_MAX_VALUE, DEFAULT_MAX_VALUE)).toBe(100);
    expect(scoreGuess(Number.MIN_VALUE, Number.MIN_VALUE)).toBe(100);
    expect(scoreGuess(Number.MIN_VALUE, DEFAULT_MAX_VALUE)).toBe(0);
  });
  it("enforces a configurable maximum", () => {
    expect(scoreGuess(20, 20, 20)).toBe(100);
    expect(() => scoreGuess(21, 20, 20)).toThrow(RangeError);
    expect(() => scoreGuess(20, 21, 20)).toThrow(RangeError);
    for (const maximum of [0, -1, NaN, Infinity]) {
      expect(() => scoreGuess(1, 1, maximum)).toThrow(RangeError);
    }
  });
});
