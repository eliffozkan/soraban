import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ create: vi.fn(), getUser: vi.fn(), signIn: vi.fn(), rpc: vi.fn() }));
vi.mock("../../lib/supabase/server", () => ({ createSupabaseServerClient: mocks.create }));

import { POST as session } from "../../app/api/session/anonymous/route";
import { POST as guess } from "../../app/api/guesses/route";
import { GET as today } from "../../app/api/today/route";
import { GET as me } from "../../app/api/me/today/route";

const anonymous = { id: "synthetic-user", is_anonymous: true };
const missing = { name: "AuthSessionMissingError", status: 400 };
const questionId = "12345678-1234-4234-8234-123456789abc";
function request(path = "session/anonymous", body?: string, origin: string | null = "https://soraban.test") {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (origin !== null) headers.Origin = origin;
  return new Request(`https://soraban.test/api/${path}`, { method: "POST", headers, body });
}
async function expectError(response: Response, status: number, code: string) {
  expect(response.status).toBe(status);
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect(response.headers.get("Pragma")).toBe("no-cache");
  const body = await response.json();
  expect(body).toEqual({ error: { code, message: expect.any(String) } });
  expect(JSON.stringify(body)).not.toMatch(/correctAnswer|reasoning|sourceUrl|access_token|refresh_token|synthetic-secret/);
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.create.mockResolvedValue({ auth: { getUser: mocks.getUser, signInAnonymously: mocks.signIn }, rpc: mocks.rpc });
  mocks.getUser.mockResolvedValue({ data: { user: anonymous }, error: null });
  mocks.rpc.mockResolvedValue({ data: null, error: { code: "PGRST202", message: "Uninitialized schema: synthetic-secret" } });
});

describe("anonymous session HTTP boundary", () => {
  it("creates and then independently verifies an anonymous session", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: missing });
    mocks.signIn.mockResolvedValue({ data: { session: {}, user: anonymous }, error: null });
    const response = await session(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ready", isAnonymous: true });
    expect(mocks.getUser).toHaveBeenCalledTimes(2);
    expect(mocks.signIn).toHaveBeenCalledTimes(1);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
  it.each([true, false])("reuses the existing user with isAnonymous=%s across repeated requests", async (is_anonymous) => {
    mocks.getUser.mockResolvedValue({ data: { user: { ...anonymous, is_anonymous } }, error: null });
    for (let i = 0; i < 3; i++) expect(await (await session(request())).json()).toEqual({ status: "ready", isAnonymous: is_anonymous });
    expect(mocks.signIn).not.toHaveBeenCalled();
    expect(mocks.create).toHaveBeenCalledTimes(3);
  });
  it.each([null, "https://evil.test", "null"])("rejects missing/foreign origin %s before auth", async (origin) => {
    await expectError(await session(request(undefined, undefined, origin)), 403, "ORIGIN_FORBIDDEN");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("rejects cross-site fetch metadata even with a matching Origin", async () => {
    const req = request(); req.headers.set("Sec-Fetch-Site", "cross-site");
    await expectError(await session(req), 403, "ORIGIN_FORBIDDEN");
  });
  it.each(["bad_jwt", "session_not_found", "session_expired", "refresh_token_not_found", "refresh_token_already_used"])("does not replace an invalid session (%s)", async (code) => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { status: 400, code } });
    await expectError(await session(request()), 401, "AUTH_REQUIRED");
    expect(mocks.signIn).not.toHaveBeenCalled();
  });
  it("does not create an account on auth outage or throw raw errors", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { status: 500, message: "synthetic-secret" } });
    await expectError(await session(request()), 503, "AUTH_UNAVAILABLE");
    expect(mocks.signIn).not.toHaveBeenCalled();
    mocks.getUser.mockRejectedValue(new Error("synthetic-secret"));
    await expectError(await session(request()), 503, "SERVICE_UNAVAILABLE");
  });
  it("propagates Auth's rate limit safely", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { status: 429 } });
    const response = await session(request());
    expect(response.headers.get("Retry-After")).toBe("60");
    await expectError(response, 429, "AUTH_RATE_LIMITED");
  });
  it.each([429, 500])("handles anonymous creation failure %s", async (status) => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: missing });
    mocks.signIn.mockResolvedValue({ data: { session: null, user: null }, error: { status, message: "synthetic-secret" } });
    await expectError(await session(request()), status === 429 ? 429 : 503, status === 429 ? "AUTH_RATE_LIMITED" : "AUTH_UNAVAILABLE");
  });
  it("rejects malformed success and mismatched post-sign-in identities", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: missing });
    mocks.signIn.mockResolvedValue({ data: { session: null, user: anonymous }, error: null });
    await expectError(await session(request()), 503, "AUTH_UNAVAILABLE");
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: missing });
    mocks.signIn.mockResolvedValue({ data: { session: {}, user: { ...anonymous, id: "other" } }, error: null });
    await expectError(await session(request()), 503, "AUTH_UNAVAILABLE");
  });
});

describe("gameplay boundaries with unapplied schema", () => {
  it.each([today, me])("requires authentication for reads and never creates accounts", async (read) => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: missing });
    await expectError(await read(), 401, "AUTH_REQUIRED");
    expect(mocks.signIn).not.toHaveBeenCalled();
  });
  it.each([today, me])("returns truthful unavailable to authenticated reads", async (read) => {
    await expectError(await read(), 503, "DAY_UNAVAILABLE");
  });
  it("rejects unauthenticated guesses before reading the body", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: missing });
    await expectError(await guess(request("guesses", "not json")), 401, "AUTH_REQUIRED");
    expect(mocks.signIn).not.toHaveBeenCalled();
  });
  it.each(["{", "null", "[]", JSON.stringify({ questionId, guess: "1" }), JSON.stringify({ questionId, guess: 0 }), JSON.stringify({ questionId, guess: 1, score: 100 }), JSON.stringify({ questionId, guess: 1e100 }), " ".repeat(1025)])("rejects invalid request body", async (body) => {
    await expectError(await guess(request("guesses", body)), 400, "INVALID_GUESS");
  });
  it("rejects absent body or wrong content type", async () => {
    await expectError(await guess(request("guesses")), 400, "INVALID_GUESS");
    const req = request("guesses", JSON.stringify({ questionId, guess: 1 })); req.headers.set("Content-Type", "text/plain");
    await expectError(await guess(req), 400, "INVALID_GUESS");
  });
  it("does not claim persistence when the guess RPC is missing", async () => {
    await expectError(await guess(request("guesses", JSON.stringify({ questionId, guess: 1250 }))), 503, "DAY_UNAVAILABLE");
  });
  it("rejects cross-origin guesses before verifying identity", async () => {
    await expectError(await guess(request("guesses", "{}", "https://evil.test")), 403, "ORIGIN_FORBIDDEN");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("sanitizes configuration failures on every endpoint", async () => {
    mocks.create.mockRejectedValue(new Error("synthetic-secret"));
    for (const response of [await today(), await me(), await session(request()), await guess(request("guesses", "{}"))]) {
      await expectError(response, 503, "SERVICE_UNAVAILABLE");
    }
  });
});

describe("gameplay HTTP flow with mocked RPC transport (not database tests)", () => {
  const day = { id: "synthetic-day", number: 1, date: "2000-01-01" };
  const progress = { answeredCount: 0, totalCount: 5, completed: false, scoreRaw: null };
  const questions = Array.from({ length: progress.totalCount }, (_, i) => ({
    id: i ? `synthetic-question-${i}` : questionId, position: i + 1,
    prompt: "Synthetic test prompt", unit: "adet", state: "unanswered", category: "kampus",
  }));
  const saved = { questionId, guess: 1250, scoreRaw: 84.94850021680094,
    correctAnswer: 2500, reasoning: "Synthetic test reasoning", sourceUrl: "https://example.org/synthetic" };

  it("fetches public questions, awaits committed submission, then fetches the caller's results", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { day, questions, progress }, error: null });
    const publicResponse = await today();
    expect(publicResponse.status).toBe(200);
    expect(await publicResponse.json()).toEqual({ day, questions, progress });
    expect(mocks.rpc).toHaveBeenLastCalledWith("soraban_today", {});

    let finish!: (value: unknown) => void;
    mocks.rpc.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    let responded = false;
    const pending = guess(request("guesses", JSON.stringify({ questionId, guess: 1250 }))).then(r => { responded = true; return r; });
    await vi.waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(2));
    expect(responded).toBe(false);
    const after = { ...progress, answeredCount: 1 };
    finish({ data: { guess: saved, progress: after }, error: null });
    expect(await (await pending).json()).toEqual({ guess: saved, progress: after });
    expect(mocks.rpc).toHaveBeenLastCalledWith("soraban_submit_guess", { p_question_id: questionId, p_guess: 1250 });
    mocks.rpc.mockResolvedValueOnce({ data: { day, guesses: [saved], progress: after }, error: null });
    expect(await (await me()).json()).toEqual({ day, guesses: [saved], progress: after });
    expect(mocks.rpc).toHaveBeenLastCalledWith("soraban_my_today", {});
  });
  it("allowlists public DTO fields even if a broken RPC includes private fields", async () => {
    mocks.rpc.mockResolvedValue({ data: { day, progress, correctAnswer: 2500, reasoning: "hidden",
      questions: questions.map(q => ({ ...q, correctAnswer: 2500, sourceUrl: "https://example.org/hidden" })) }, error: null });
    const result = JSON.stringify(await (await today()).json());
    expect(result).not.toMatch(/correctAnswer|reasoning|sourceUrl|hidden/);
  });
  it("preserves zero/raw scores and completion after a void without assuming five answers", async () => {
    const states = questions.map((q, i) => ({ ...q, state: i ? "answered" : "void" }));
    const complete = { answeredCount: 4, totalCount: 5, completed: true, scoreRaw: 0 };
    mocks.rpc.mockResolvedValue({ data: { day, progress: complete, questions: states }, error: null });
    expect((await (await today()).json()).progress).toEqual(complete);
  });
  it("maps only expected SQL errors and never forwards database details", async () => {
    for (const [code, status, message] of [
      ["PT400", 400, "INVALID_GUESS"], ["PT401", 401, "AUTH_REQUIRED"],
      ["PT404", 404, "QUESTION_NOT_FOUND"], ["PT409", 409, "DAY_CLOSED"],
      ["42501", 503, "DAY_UNAVAILABLE"], ["42P01", 503, "DAY_UNAVAILABLE"],
    ] as const) {
      mocks.rpc.mockResolvedValueOnce({ data: null, error: { code, message: status === 503 ? "synthetic-secret" : message } });
      await expectError(await guess(request("guesses", JSON.stringify({ questionId, guess: 1250 }))), status, message);
    }
  });
  it("rejects malformed database responses without pretending the operation succeeded", async () => {
    mocks.rpc.mockResolvedValue({ data: { correctAnswer: 2500 }, error: null });
    await expectError(await today(), 503, "DAY_UNAVAILABLE");
    await expectError(await me(), 503, "DAY_UNAVAILABLE");
    await expectError(await guess(request("guesses", JSON.stringify({ questionId, guess: 1250 }))), 503, "DAY_UNAVAILABLE");
  });
});
