import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CookieOptions } from "@supabase/ssr";

const jar = vi.hoisted(() => ({ values: new Map<string, { value: string; options?: CookieOptions }>(), failWrites: false }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [...jar.values].map(([name, { value }]) => ({ name, value })),
    set: (name: string, value: string, options: CookieOptions) => {
      if (jar.failWrites) throw new Error("Synthetic cookie failure");
      if (options.maxAge === 0) jar.values.delete(name);
      else jar.values.set(name, { value, options });
    },
  }),
}));

import { createSupabaseServerClient } from "../../lib/supabase/server";
import { ensureAnonymousSession } from "../../lib/supabase/session";
import { POST } from "../../app/api/session/anonymous/route";
import { GET } from "../../app/api/today/route";

// Entirely synthetic Auth protocol fixtures, never real credentials/users.
const user = { id: "12345678-1234-4234-8234-123456789abc", aud: "authenticated", role: "authenticated", is_anonymous: true, app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
function session(expiresAt = Math.floor(Date.now() / 1000) + 3600) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return { access_token: `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, exp: expiresAt, role: "authenticated" })}.c3ludGhldGlj`, refresh_token: "synthetic-refresh", token_type: "bearer", expires_in: 3600, expires_at: expiresAt, user };
}
const fetchMock = vi.fn<typeof fetch>();
function storeSession(value: ReturnType<typeof session>) {
  jar.values.set("sb-synthetic-auth-token", { value: `base64-${Buffer.from(JSON.stringify(value)).toString("base64url")}` });
}

beforeEach(() => {
  jar.values.clear(); jar.failWrites = false;
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://synthetic.supabase.test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "synthetic-publishable-key");
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/v1/signup")) return Response.json(session());
    if (url.endsWith("/auth/v1/user")) return Response.json(user);
    if (url.includes("/auth/v1/token?grant_type=refresh_token")) return Response.json(session());
    throw new Error("Unexpected synthetic Auth request");
  });
});

afterEach(() => vi.unstubAllEnvs());

describe("actual SSR SDK with mocked Auth transport and Next cookie store", () => {
  it("persists signup cookies and reuses them in new request-scoped clients", async () => {
    expect(await ensureAnonymousSession(await createSupabaseServerClient())).toEqual({ status: "ready", isAnonymous: true });
    expect(jar.values.size).toBeGreaterThan(0);
    for (const entry of jar.values.values()) expect(entry.options).toMatchObject({ path: "/", sameSite: "lax" });
    for (let i = 0; i < 2; i++) expect(await ensureAnonymousSession(await createSupabaseServerClient())).toEqual({ status: "ready", isAnonymous: true });
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/signup"))).toHaveLength(1);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/user"))).toHaveLength(3);
    for (const [, init] of fetchMock.mock.calls) expect(init?.cache).toBe("no-store");
  });
  it("refreshes an expired session and writes refreshed cookies without signup", async () => {
    storeSession(session(Math.floor(Date.now() / 1000) - 60));
    expect(await ensureAnonymousSession(await createSupabaseServerClient())).toEqual({ status: "ready", isAnonymous: true });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("grant_type=refresh_token"))).toBe(true);
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/signup"))).toBe(false);
    expect([...jar.values.values()].some(({ options }) => options?.sameSite === "lax")).toBe(true);
  });
  it("preserves permanent identity through an actual SDK refresh", async () => {
    const permanent = { ...user, is_anonymous: false };
    storeSession({ ...session(Math.floor(Date.now() / 1000) - 60), user: permanent });
    fetchMock.mockImplementation(async (input) => {
      if (String(input).includes("grant_type=refresh_token")) return Response.json({ ...session(), user: permanent });
      if (String(input).endsWith("/user")) return Response.json(permanent);
      throw new Error("A permanent user must not trigger signup");
    });
    expect(await ensureAnonymousSession(await createSupabaseServerClient())).toEqual({ status: "ready", isAnonymous: false });
    expect(fetchMock.mock.calls).toHaveLength(2);
  });
  it("reads chunked session cookies and removes stale chunks after a refresh", async () => {
    const large = { ...session(), user: { ...user, user_metadata: { syntheticPadding: "x".repeat(5000) } } };
    fetchMock.mockImplementation(async (input) => {
      if (String(input).endsWith("/signup")) return Response.json(large);
      if (String(input).endsWith("/user")) return Response.json(user);
      if (String(input).includes("grant_type=refresh_token")) return Response.json(session());
      throw new Error("Unexpected synthetic request");
    });
    await ensureAnonymousSession(await createSupabaseServerClient());
    expect(jar.values.has("sb-synthetic-auth-token.1")).toBe(true);
    const client = await createSupabaseServerClient();
    expect(await ensureAnonymousSession(client)).toEqual({ status: "ready", isAnonymous: true });
    await client.auth.refreshSession();
    expect(jar.values.has("sb-synthetic-auth-token.1")).toBe(false);
    expect(jar.values.has("sb-synthetic-auth-token")).toBe(true);
  });
  it("rejects a revoked session returned by Auth without signing up", async () => {
    storeSession(session());
    fetchMock.mockResolvedValue(Response.json({ code: "session_not_found", msg: "Synthetic revoked session" }, { status: 401 }));
    const response = await POST(new Request("https://soraban.test/api/session/anonymous", { method: "POST", headers: { Origin: "https://soraban.test" } }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: "AUTH_REQUIRED", message: expect.any(String) } });
    expect(fetchMock.mock.calls.every(([url]) => String(url).endsWith("/user"))).toBe(true);
  });
  it("uses secure cookies in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await ensureAnonymousSession(await createSupabaseServerClient());
    for (const entry of jar.values.values()) expect(entry.options?.secure).toBe(true);
  });
  it("fails safely when cookie persistence fails", async () => {
    jar.failWrites = true;
    const response = await POST(new Request("https://soraban.test/api/session/anonymous", { method: "POST", headers: { Origin: "https://soraban.test" } }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: { code: "SERVICE_UNAVAILABLE", message: expect.any(String) } });
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
  it.each(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"])("handles missing %s without external calls", async (key) => {
    vi.stubEnv(key, "");
    const response = await POST(new Request("https://soraban.test/api/session/anonymous", { method: "POST", headers: { Origin: "https://soraban.test" } }));
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("SERVICE_UNAVAILABLE");
    expect((await GET()).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
