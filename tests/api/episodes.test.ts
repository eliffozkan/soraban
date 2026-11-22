import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ create: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock("../../lib/supabase/server", () => ({ createSupabaseServerClient: mocks.create }));
import { GET as list } from "../../app/api/episodes/route";
import { GET as episode } from "../../app/api/episodes/[slug]/route";
import { GET as mine } from "../../app/api/me/episodes/[slug]/route";
import { GET as board } from "../../app/api/episodes/[slug]/leaderboard/route";
import { GET as profile } from "../../app/api/me/profile/route";
import { POST as nickname } from "../../app/api/me/nickname/route";
import { GET as getNickname } from "../../app/api/me/nickname/route";
import { GET as adapterMine } from "../../app/api/episodes/[slug]/me/route";
import { normalizeNickname } from "../../lib/game/nickname";
import { createHttpClient } from "../../lib/client/http-adapter";

const meta = { id: "synthetic-episode", slug: "demo", kind: "demo", title: "Demo", date: null, totalCount: 5 };
const progress = { answeredCount: 0, totalCount: 5, completed: false, scoreRaw: null };
const ownProfile = { nickname: "Elif A", displayName: "Anonim oyuncu", nicknameApproved: false, nicknameLocked: false, leaderboardHidden: false };
const context = (slug = "demo") => ({ params: Promise.resolve({ slug }) });
const req = (body?: unknown, origin = "https://soraban.test") => new Request("https://soraban.test/api/me/nickname", {
  method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body),
});
beforeEach(() => {
  vi.resetAllMocks();
  mocks.create.mockResolvedValue({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc });
  mocks.getUser.mockResolvedValue({ data: { user: { id: "synthetic-player", is_anonymous: true } }, error: null });
  mocks.rpc.mockResolvedValue({ data: null, error: { code: "PGRST202", message: "synthetic-private-db-details" } });
});

it("lists published metadata publicly and filters answers out of episode questions", async () => {
  mocks.rpc.mockResolvedValueOnce({ data: { episodes: [{ ...meta, answer: 123 }] }, error: null });
  expect(await (await list()).json()).toEqual({ episodes: [meta] });
  expect(mocks.getUser).not.toHaveBeenCalled();
  const questions = Array.from({ length: 5 }, (_, i) => ({ id: `synthetic-${i}`, position: i + 1,
    prompt: "SYNTHETIC question", unit: "test", state: "unanswered", correctAnswer: 123, reasoning: "private" }));
  mocks.rpc.mockResolvedValueOnce({ data: { episode: meta, questions, progress }, error: null });
  const result = await episode(new Request("https://soraban.test"), context());
  expect(result.status).toBe(200);
  expect(JSON.stringify(await result.json())).not.toMatch(/correctAnswer|reasoning|sourceUrl|playerId/);
  expect(mocks.rpc).toHaveBeenLastCalledWith("soraban_episode", { p_slug: "demo", p_reveal: false });
  expect(result.headers.get("Cache-Control")).toContain("no-store");
});

it("restores only the selected episode and does not invent a date for Demo", async () => {
  for (const slug of ["demo", "2026-11-22"]) {
    const selected = { ...meta, slug, kind: slug === "demo" ? "demo" : "dated", date: slug === "demo" ? null : slug };
    mocks.rpc.mockResolvedValueOnce({ data: { episode: selected, guesses: [], progress }, error: null });
    expect((await (await mine(new Request("https://soraban.test"), context(slug))).json()).episode).toEqual(selected);
    expect(mocks.rpc).toHaveBeenLastCalledWith("soraban_episode", { p_slug: slug, p_reveal: true });
  }
  expect((await episode(new Request("https://soraban.test"), context("other"))).status).toBe(404);
});

it("requires identity for profile/guesses, checks Origin and rejects overposted nickname data", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: { name: "AuthSessionMissingError" } });
  expect((await profile()).status).toBe(401);
  expect((await episode(new Request("https://soraban.test"), context())).status).toBe(401);
  expect((await nickname(req({ nickname: "Elif" }))).status).toBe(401);
  expect((await nickname(req({ nickname: "Elif" }, "https://evil.test"))).status).toBe(403);
  expect(mocks.rpc).not.toHaveBeenCalled();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "synthetic", is_anonymous: true } }, error: null });
  for (const body of [{ nickname: "Elif", playerId: "other" }, { nickname: "<script>" }, { nickname: "x" }, { nickname: "x".repeat(600) }]) {
    expect((await nickname(req(body))).status).toBe(400);
  }
  expect(mocks.rpc).not.toHaveBeenCalled();
});

it("normalizes nicknames and preserves safe database moderation/rate-limit failures", async () => {
  expect(normalizeNickname("  Elif   Çığ  ")).toBe("Elif Çığ");
  expect(normalizeNickname("elif.1")).toBe("elif.1");
  expect(normalizeNickname("Elif\u202e")).toBeNull();
  expect(normalizeNickname("Elif\nA")).toBe("Elif A");
  mocks.rpc.mockResolvedValueOnce({ data: { ...ownProfile, playerId: "private-id", moderationReason: "private" }, error: null });
  expect(await (await nickname(req({ nickname: " Elif  A " }))).json()).toEqual(ownProfile);
  expect(mocks.rpc).toHaveBeenLastCalledWith("soraban_set_nickname", { p_nickname: "Elif A" });
  for (const [code, message, status] of [["PT429", "RATE_LIMITED", 429], ["PT422", "NICKNAME_REJECTED", 422], ["PT400", "NICKNAME_INVALID", 400]] as const) {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code, message } });
    const result = await nickname(req({ nickname: "Elif A" }));
    expect(result.status).toBe(status);
    expect((await result.json()).error.code).toBe(message);
    if (status === 429) expect(result.headers.get("Retry-After")).toBe("60");
  }
});

it("returns safe episode ranks and own position without IDs or moderation data", async () => {
  const rank = { rank: 1, nickname: "Anonim oyuncu", scoreRaw: 84.94850021680094, isMe: true };
  mocks.rpc.mockResolvedValueOnce({ data: { episode: meta, status: "ready", entries: [{ ...rank, playerId: "private-id" }],
    me: { ...rank, email: "private@example.test" }, playerCount: 1, limit: 50, offset: 0 }, error: null });
  const result = await board(new Request("https://soraban.test/api/episodes/demo/leaderboard"), context());
  expect(result.status).toBe(200);
  const data = await result.json();
  expect(data.entries).toEqual([rank]); expect(data.me).toEqual({ rank: rank.rank, scoreRaw: rank.scoreRaw });
  expect(JSON.stringify(data)).not.toMatch(/private-id|email|moderation/);
  expect(mocks.rpc).toHaveBeenLastCalledWith("soraban_episode_leaderboard", { p_slug: "demo", p_limit: 50, p_offset: 0 });
  for (const query of ["limit=101", "offset=-1", "limit=2&limit=3", "playerId=other"]) {
    expect((await board(new Request(`https://soraban.test/?${query}`), context())).status).toBe(400);
  }
});

it("connects the merged PR #12 HTTP adapter to real backend handlers with mocked Auth/RPC only", async () => {
  const complete = { answeredCount: 5, totalCount: 5, completed: true, scoreRaw: 100 };
  const questions = Array.from({ length: 5 }, (_, i) => ({ id: `synthetic-${i}`, position: i + 1,
    prompt: "SYNTHETIC prompt", unit: "test", state: "answered" }));
  const guesses = questions.map(q => ({ questionId: q.id, guess: 10, correctAnswer: 10,
    scoreRaw: 100, reasoning: "SYNTHETIC reasoning", sourceUrl: "https://example.org/synthetic" }));
  mocks.rpc.mockImplementation(async (name, args) => {
    if (name === "soraban_profile" || name === "soraban_set_nickname") return { data: ownProfile, error: null };
    if (name === "soraban_episode") return { data: { episode: meta, progress: complete,
      ...(args.p_reveal ? { guesses } : { questions }) }, error: null };
    return { data: { episode: meta, status: "ready", entries: [{ rank: 1, nickname: "Anonim oyuncu", scoreRaw: 100, isMe: true }],
      me: { rank: 1, scoreRaw: 100 }, playerCount: 1, limit: 50, offset: 0 }, error: null };
  });
  const client = createHttpClient({ baseUrl: "https://soraban.test", fetch: async (input, init) => {
    const request = new Request(String(input), init);
    if (request.method === "POST") request.headers.set("Origin", "https://soraban.test");
    const path = new URL(request.url).pathname;
    if (path === "/api/me/nickname") return request.method === "POST" ? nickname(request) : getNickname();
    if (path.endsWith("/leaderboard")) return board(request, context());
    if (path.endsWith("/me")) return adapterMine(request, context());
    return episode(request, context());
  } });
  expect((await client.getEpisode("demo")).progress).toEqual(complete);
  expect((await client.getMyEpisode("demo")).guesses).toHaveLength(5);
  expect(await client.getNickname()).toEqual({ nickname: "Elif A" });
  expect(await client.setNickname("Elif A")).toEqual({ nickname: "Elif A" });
  const ranks = await client.getEpisodeLeaderboard("demo");
  expect(ranks.playerCount).toBe(1);
  expect(ranks.entries[0].isMe).toBe(true);
  expect(ranks.me).toEqual({ rank: 1, scoreRaw: 100 });
});

it("fails safely on missing database functions without exposing provisional success", async () => {
  for (const result of [await list(), await profile(), await mine(new Request("https://soraban.test"), context())]) {
    expect(result.status).toBe(503);
    expect(await result.json()).toEqual({ error: { code: "DAY_UNAVAILABLE", message: expect.any(String) } });
  }
});
