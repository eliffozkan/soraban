import { describe, expect, it, vi } from "vitest";
import { createMockClient } from "../../../lib/client/mock-adapter";
import { createHttpClient } from "../../../lib/client/http-adapter";
import { SorabanClientError } from "../../../lib/client/errors";
import type { EpisodeSlug } from "../../../lib/client/types";

async function errorCode(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(SorabanClientError);
    return (error as SorabanClientError).code;
  }
  throw new Error("Hata bekleniyordu.");
}

describe("mock episodes", () => {
  it("keeps Demo and 22 Kasım progress independent", async () => {
    const client = createMockClient();
    await client.ensureGuestSession();
    const demo = await client.getEpisode("demo");
    const dated = await client.getEpisode("2026-11-22");
    expect(demo.questions).toHaveLength(5);
    expect(dated.questions).toHaveLength(5);
    expect(new Set([...demo.questions, ...dated.questions].map((q) => q.id)).size).toBe(10);

    let last;
    for (const q of demo.questions) last = await client.submitGuess({ questionId: q.id, guess: 10 });
    expect(last?.progress.completed).toBe(true);

    expect((await client.getEpisode("2026-11-22")).progress).toMatchObject({ answeredCount: 0, completed: false });
    expect((await client.getMyEpisode("2026-11-22")).guesses).toEqual([]);
    expect((await client.getMyEpisode("demo")).guesses).toHaveLength(5);
  });

  it("scores each guess with the real formula and averages the episode", async () => {
    const client = createMockClient();
    await client.ensureGuestSession();
    const { questions } = await client.getEpisode("demo");
    expect(questions.map((q) => q.prompt)).not.toEqual((await client.getEpisode("2026-11-22")).questions.map((q) => q.prompt));
    const exact = await client.submitGuess({ questionId: questions[0].id, guess: 38 });
    expect(exact.guess.scoreRaw).toBe(100);
    const off = await client.submitGuess({ questionId: questions[1].id, guess: 23 });
    expect(off.guess.scoreRaw).toBeCloseTo(100 - 50 * Math.log10(2), 6);
    let last;
    for (const q of questions.slice(2)) last = await client.submitGuess({ questionId: q.id, guess: 1e9 });
    const scores = (await client.getMyEpisode("demo")).guesses.map((g) => g.scoreRaw);
    expect(last?.progress.scoreRaw).toBeCloseTo(scores.reduce((a, b) => a + b, 0) / 5, 9);
  });

  it("leaderboard shows only this player's own completed result, never fake players", async () => {
    const client = createMockClient();
    await client.ensureGuestSession();
    expect(await client.getEpisodeLeaderboard("demo")).toMatchObject({ entries: [], playerCount: 0, me: null });
    await client.setNickname("  Test  Oyuncu ");
    for (const q of (await client.getEpisode("demo")).questions) await client.submitGuess({ questionId: q.id, guess: 10 });
    const board = await client.getEpisodeLeaderboard("demo");
    expect(board.entries).toEqual([{ rank: 1, nickname: "Test Oyuncu", scoreRaw: expect.any(Number), isMe: true }]);
    expect(board.me?.rank).toBe(1);
    expect((await client.getEpisodeLeaderboard("2026-11-22")).entries).toEqual([]);
  });

  it("rejects invalid nicknames and unknown episodes", async () => {
    const client = createMockClient();
    await client.ensureGuestSession();
    expect(await errorCode(client.setNickname("a@b.co"))).toBe("NICKNAME_INVALID");
    expect((await client.getNickname()).nickname).toBeNull();
    expect(await errorCode(client.getEpisode("2026-11-23" as EpisodeSlug))).toBe("EPISODE_NOT_FOUND");
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
const progress = { answeredCount: 0, totalCount: 5, completed: false, scoreRaw: null };

describe("HTTP episodes", () => {
  it("calls per-episode endpoints and drops unexpected fields", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      json({
        episode: { slug: "demo", kind: "demo", title: "X", date: null },
        entries: [{ rank: 1, nickname: "Ada", scoreRaw: 80, isMe: false, userId: "secret", email: "a@b.c" }],
        playerCount: 1,
        me: null,
      }),
    );
    const client = createHttpClient({ fetch: fetchMock });
    const board = await client.getEpisodeLeaderboard("demo");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/episodes/demo/leaderboard");
    expect(board.entries).toEqual([{ rank: 1, nickname: "Ada", scoreRaw: 80, isMe: false }]);
    expect(board.episode.title).toBe("Demo");
  });

  it("rejects a response for a different episode", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      json({ episode: { slug: "demo" }, questions: [], progress }),
    );
    const client = createHttpClient({ fetch: fetchMock });
    expect(await errorCode(client.getEpisode("2026-11-22"))).toBe("MALFORMED_RESPONSE");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/episodes/2026-11-22");
  });

  it("posts only the nickname and maps NICKNAME_REJECTED", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({ nickname: "Ada" }))
      .mockResolvedValueOnce(json({ error: { code: "NICKNAME_REJECTED", message: "no" } }, 422));
    const client = createHttpClient({ fetch: fetchMock });
    await expect(client.setNickname("Ada")).resolves.toEqual({ nickname: "Ada" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/me/nickname");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ nickname: "Ada" });
    expect(await errorCode(client.setNickname("kötü"))).toBe("NICKNAME_REJECTED");
  });
});
