import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ create: vi.fn(), getUser: vi.fn(), signIn: vi.fn() }));
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
  mocks.create.mockResolvedValue({ auth: { getUser: mocks.getUser, signInAnonymously: mocks.signIn } });
  mocks.getUser.mockResolvedValue({ data: { user: anonymous }, error: null });
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
  it("does not claim persistence for a valid guess", async () => {
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
