import { describe, expect, it } from "vitest";
import { parseGuessRequest } from "../../lib/game/validation";

const questionId = "12345678-1234-4234-8234-123456789abc";
describe("guess payload validation", () => {
  it.each([Number.MIN_VALUE, 0.5, 1250, 1e15])("accepts positive finite number %s without rounding", (guess) => {
    expect(parseGuessRequest({ questionId, guess })).toEqual({ questionId, guess });
  });
  it.each([0, -0, -1, NaN, Infinity, -Infinity, 1e15 + 1, "1250", null, true, [], {}])("rejects invalid guess %s", (guess) => {
    expect(parseGuessRequest({ questionId, guess })).toBeNull();
  });
  it.each([null, [], {}, { questionId }, { guess: 1 }, { questionId: "forged", guess: 1 }, { questionId, guess: 1, playerId: "other" }, { questionId, guess: 1, score: 100 }])("rejects malformed/overposted body %j", (body) => {
    expect(parseGuessRequest(body)).toBeNull();
  });
});
