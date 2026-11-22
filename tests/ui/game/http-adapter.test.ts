import { describe, expect, it, vi } from "vitest";
import { createHttpClient } from "../../../lib/client/http-adapter";
import { SorabanClientError } from "../../../lib/client/errors";
import { resolveClientMode } from "../../../lib/client";

// Sentetik test verisi (gerçek ODTÜ bilgisi değil).
const day = { id: "test-day", number: 1, date: "2000-01-01" };
const progress = { answeredCount: 0, totalCount: 5, completed: false, scoreRaw: null };
const questions = Array.from({ length: 5 }, (_, i) => ({
  id: `test-q-${i + 1}`,
  position: i + 1,
  prompt: "Test sorusu?",
  unit: "adet",
  state: "unanswered",
  category: "kampus",
}));
const reveal = {
  questionId: "test-q-1",
  guess: 1250,
  scoreRaw: 84.94850021680094,
  correctAnswer: 2500,
  reasoning: "Test açıklaması",
  sourceUrl: "https://example.org/test",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function clientWith(...responses: Array<Response | Error>) {
  const fetchMock = vi.fn<typeof fetch>();
  for (const r of responses) {
    if (r instanceof Error) fetchMock.mockRejectedValueOnce(r);
    else fetchMock.mockResolvedValueOnce(r);
  }
  return { client: createHttpClient({ fetch: fetchMock }), fetchMock };
}

async function caught(promise: Promise<unknown>): Promise<SorabanClientError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(SorabanClientError);
    return error as SorabanClientError;
  }
  throw new Error("Hata bekleniyordu.");
}

describe("HTTP SorabanClient — requests", () => {
  it("opens a guest session with a same-origin POST and no body", async () => {
    const { client, fetchMock } = clientWith(json({ status: "ready", isAnonymous: true }));
    await expect(client.ensureGuestSession()).resolves.toEqual({ status: "ready", isAnonymous: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/session/anonymous");
    expect(init).toMatchObject({ method: "POST", credentials: "same-origin", cache: "no-store" });
    expect(init?.body).toBeUndefined();
  });

  it("fetches today's public questions", async () => {
    const { client, fetchMock } = clientWith(json({ day, questions, progress }));
    const today = await client.getToday();
    expect(today).toEqual({ day, questions, progress });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/today");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "GET", cache: "no-store" });
  });

  it("sends only questionId and guess when submitting", async () => {
    const after = { ...progress, answeredCount: 1 };
    const { client, fetchMock } = clientWith(json({ guess: reveal, progress: after }));
    const extra = { questionId: "test-q-1", guess: 1250, score: 100, playerId: "x" };
    const result = await client.submitGuess(extra);
    expect(result).toEqual({ guess: reveal, progress: after });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/guesses");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ questionId: "test-q-1", guess: 1250 });
    expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
  });

  it("fetches the player's own results", async () => {
    const after = { ...progress, answeredCount: 1 };
    const { client, fetchMock } = clientWith(json({ day, guesses: [reveal], progress: after }));
    await expect(client.getMyToday()).resolves.toEqual({ day, guesses: [reveal], progress: after });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/me/today");
  });

  it("uses baseUrl when given", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json({ day, questions, progress }));
    await createHttpClient({ baseUrl: "http://localhost:3000", fetch: fetchMock }).getToday();
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:3000/api/today");
  });

  it("keeps the leaderboard 'unavailable' without a network call", async () => {
    const { client, fetchMock } = clientWith();
    await expect(client.getLeaderboard("daily")).resolves.toEqual({ scope: "daily", status: "unavailable" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("HTTP SorabanClient — response checks", () => {
  it("drops unexpected private fields from public questions", async () => {
    const leaky = questions.map((q) => ({ ...q, correctAnswer: 1, sourceUrl: "https://example.org/x" }));
    const { client } = clientWith(json({ day, questions: leaky, progress, secret: "x" }));
    const text = JSON.stringify(await client.getToday());
    expect(text).not.toMatch(/correctAnswer|sourceUrl|secret/);
  });

  it("omits a missing or unknown category instead of failing", async () => {
    const mixed = questions.map((q, i) => (i === 0 ? { ...q, category: "bilinmeyen" } : i === 1 ? { ...q, category: null } : q));
    const { client } = clientWith(json({ day, questions: mixed, progress }));
    const today = await client.getToday();
    expect(today.questions[0]).not.toHaveProperty("category");
    expect(today.questions[1]).not.toHaveProperty("category");
    expect(today.questions[2].category).toBe("kampus");
  });

  it("keeps a zero daily score (not treated as missing)", async () => {
    const done = { answeredCount: 4, totalCount: 5, completed: true, scoreRaw: 0 };
    const { client } = clientWith(json({ day, guesses: [], progress: done }));
    expect((await client.getMyToday()).progress).toEqual(done);
  });

  it.each([
    ["wrong totalCount", { day, questions, progress: { ...progress, totalCount: 6 } }],
    ["missing questions", { day, progress }],
    ["unknown state", { day, questions: [{ ...questions[0], state: "locked" }], progress }],
    ["string number", { day: { ...day, number: "1" }, questions, progress }],
    ["not an object", [1, 2, 3]],
  ])("rejects a malformed today response (%s)", async (_name, body) => {
    const { client } = clientWith(json(body));
    expect((await caught(client.getToday())).code).toBe("MALFORMED_RESPONSE");
  });

  it("rejects a 200 response that is not JSON", async () => {
    const { client } = clientWith(new Response("<html>", { status: 200 }));
    expect((await caught(client.getToday())).code).toBe("MALFORMED_RESPONSE");
  });

  it("rejects a session response that is not ready", async () => {
    const { client } = clientWith(json({ status: "pending", isAnonymous: true }));
    expect((await caught(client.ensureGuestSession())).code).toBe("MALFORMED_RESPONSE");
  });
});

describe("HTTP SorabanClient — errors", () => {
  it.each([
    [401, "AUTH_REQUIRED", "AUTH_REQUIRED", false],
    [400, "INVALID_GUESS", "INVALID_GUESS", false],
    [404, "QUESTION_NOT_FOUND", "QUESTION_NOT_FOUND", false],
    [409, "DAY_CLOSED", "DAY_CLOSED", false],
    [503, "DAY_UNAVAILABLE", "DAY_UNAVAILABLE", true],
    [429, "AUTH_RATE_LIMITED", "RATE_LIMITED", true],
    [503, "AUTH_UNAVAILABLE", "SERVICE_UNAVAILABLE", true],
    [503, "SERVICE_UNAVAILABLE", "SERVICE_UNAVAILABLE", true],
    [403, "ORIGIN_FORBIDDEN", "ORIGIN_FORBIDDEN", false],
  ] as const)("maps %i %s to %s (retryable: %s)", async (status, serverCode, clientCode, retryable) => {
    const { client } = clientWith(json({ error: { code: serverCode, message: "server detail" } }, status));
    const error = await caught(client.submitGuess({ questionId: "test-q-1", guess: 1 }));
    expect(error.code).toBe(clientCode);
    expect(error.status).toBe(status);
    expect(error.retryable).toBe(retryable);
    // Sunucunun metni kullanıcıya taşınmaz.
    expect(error.message).not.toContain("server detail");
  });

  it.each([
    [401, "AUTH_REQUIRED"],
    [429, "RATE_LIMITED"],
    [500, "SERVICE_UNAVAILABLE"],
    [502, "SERVICE_UNAVAILABLE"],
    [418, "MALFORMED_RESPONSE"],
  ] as const)("falls back to HTTP status %i when the body has no known code", async (status, clientCode) => {
    const { client } = clientWith(new Response("Bad Gateway", { status }));
    expect((await caught(client.getToday())).code).toBe(clientCode);
  });

  it("maps an unknown server code by HTTP status", async () => {
    const { client } = clientWith(json({ error: { code: "SOMETHING_NEW", message: "x" } }, 503));
    expect((await caught(client.getToday())).code).toBe("SERVICE_UNAVAILABLE");
  });

  it("turns a failed fetch into a retryable NETWORK_ERROR", async () => {
    const { client } = clientWith(new TypeError("Failed to fetch"));
    const error = await caught(client.getToday());
    expect(error.code).toBe("NETWORK_ERROR");
    expect(error.status).toBeUndefined();
    expect(error.retryable).toBe(true);
  });

  it("turns a timeout into NETWORK_ERROR", async () => {
    const fetchMock = vi.fn<typeof fetch>((_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      }),
    );
    const client = createHttpClient({ fetch: fetchMock, timeoutMs: 10 });
    expect((await caught(client.getToday())).code).toBe("NETWORK_ERROR");
  });
});

describe("client selection", () => {
  it.each([
    [undefined, "mock"],
    ["", "mock"],
    ["mock", "mock"],
    ["http", "http"],
    [" HTTP ", "http"],
    ["real", "mock"],
  ] as const)("NEXT_PUBLIC_SORABAN_CLIENT=%s → %s", (value, mode) => {
    expect(resolveClientMode(value)).toBe(mode);
  });
});
