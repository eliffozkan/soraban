import { describe, expect, it } from "vitest";
import { createMockClient } from "../../../lib/client/mock-adapter";
import { SorabanClientError } from "../../../lib/client/errors";
import { MAX_NUMERIC_VALUE } from "../../../lib/client/types";

async function errorCode(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(SorabanClientError);
    return (error as SorabanClientError).code;
  }
  throw new Error("Hata bekleniyordu.");
}

describe("mock SorabanClient", () => {
  it("requires a guest session before today's questions", async () => {
    const client = createMockClient();
    expect(await errorCode(client.getToday())).toBe("AUTH_REQUIRED");
    await expect(client.ensureGuestSession()).resolves.toEqual({ status: "ready", isAnonymous: true });
    await expect(client.ensureGuestSession()).resolves.toEqual({ status: "ready", isAnonymous: true });
    const today = await client.getToday();
    expect(today.questions).toHaveLength(6);
    expect(today.progress).toEqual({ answeredCount: 0, totalCount: 6, completed: false, scoreRaw: null });
  });

  it("never exposes answers in public questions", async () => {
    const client = createMockClient();
    await client.ensureGuestSession();
    const { questions } = await client.getToday();
    for (const q of questions) {
      expect(Object.keys(q).sort()).toEqual(["category", "id", "position", "prompt", "state", "unit"]);
      expect(q.prompt).toContain("ÖRNEK");
    }
  });

  it("reveals after submit and returns the first result on retry", async () => {
    const client = createMockClient();
    await client.ensureGuestSession();
    const first = await client.submitGuess({ questionId: "ornek-soru-1", guess: 1000 });
    expect(first.guess.guess).toBe(1000);
    expect(first.guess.correctAnswer).toBeGreaterThan(0);
    expect(first.progress.answeredCount).toBe(1);
    const retry = await client.submitGuess({ questionId: "ornek-soru-1", guess: 5 });
    expect(retry.guess).toEqual(first.guess);
    const today = await client.getToday();
    expect(today.questions[0].state).toBe("answered");
    const mine = await client.getMyToday();
    expect(mine.guesses).toEqual([first.guess]);
  });

  it.each([NaN, Infinity, 0, -1, MAX_NUMERIC_VALUE + 1])("rejects invalid guess %s", async (guess) => {
    const client = createMockClient();
    await client.ensureGuestSession();
    expect(await errorCode(client.submitGuess({ questionId: "ornek-soru-1", guess }))).toBe("INVALID_GUESS");
  });

  it("completes the day after all six and returns a server-style daily score", async () => {
    const client = createMockClient();
    await client.ensureGuestSession();
    const { questions } = await client.getToday();
    let last;
    for (const q of questions) last = await client.submitGuess({ questionId: q.id, guess: 10 });
    expect(last?.progress.completed).toBe(true);
    expect(last?.progress.scoreRaw).toEqual(expect.any(Number));
  });

  it("excludes a void question from completion", async () => {
    const client = createMockClient({ scenario: "with-void" });
    await client.ensureGuestSession();
    const { questions } = await client.getToday();
    const voided = questions.filter((q) => q.state === "void");
    expect(voided).toHaveLength(1);
    expect(await errorCode(client.submitGuess({ questionId: voided[0].id, guess: 10 }))).toBe("QUESTION_NOT_FOUND");
    let last;
    for (const q of questions.filter((q) => q.state !== "void")) {
      last = await client.submitGuess({ questionId: q.id, guess: 10 });
    }
    expect(last?.progress).toMatchObject({ answeredCount: 5, totalCount: 6, completed: true });
  });

  it("supports failure scenarios", async () => {
    expect(await errorCode(createMockClient({ scenario: "rate-limited" }).ensureGuestSession())).toBe("RATE_LIMITED");
    expect(await errorCode(createMockClient({ scenario: "network-error" }).ensureGuestSession())).toBe("NETWORK_ERROR");
    const closed = createMockClient({ scenario: "day-unavailable" });
    await closed.ensureGuestSession();
    expect(await errorCode(closed.getToday())).toBe("DAY_UNAVAILABLE");
  });

  it("shows the leaderboard as not yet available", async () => {
    const client = createMockClient();
    await expect(client.getLeaderboard("daily")).resolves.toEqual({ scope: "daily", status: "unavailable" });
  });
});
