import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { CookieMethodsServer } from "@supabase/ssr";

const mocks = vi.hoisted(() => ({ create: vi.fn(), getUser: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.create }));
import { refreshSession } from "../../lib/supabase/proxy";
import { config } from "../../proxy";
// The installed Next 16 package retains this name for its matcher test helper.
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

let cookies: CookieMethodsServer;
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://synthetic.supabase.test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "synthetic-publishable-key");
  mocks.create.mockImplementation((_url, _key, options) => {
    cookies = options.cookies;
    return { auth: { getUser: mocks.getUser } };
  });
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
});

it("forwards refreshed cookies to the downstream request and browser with cache headers", async () => {
  const request = new NextRequest("https://soraban.test/play", { headers: { Cookie: "old=synthetic" } });
  mocks.getUser.mockImplementation(async () => {
    expect(await cookies.getAll()).toContainEqual({ name: "old", value: "synthetic" });
    await cookies.setAll!([{ name: "session.0", value: "synthetic-0", options: { secure: true, sameSite: "lax", path: "/" } }], { "Cache-Control": "private, no-store", Expires: "0", Pragma: "no-cache" });
    // A second SDK cookie write must not drop earlier cookies/cache headers.
    await cookies.setAll!([{ name: "session.1", value: "synthetic-1", options: { path: "/" } }], {});
    return { data: { user: null }, error: null };
  });
  const response = await refreshSession(request);
  expect(request.cookies.get("session.0")?.value).toBe("synthetic-0");
  expect(response.headers.get("x-middleware-request-cookie")).toContain("session.1=synthetic-1");
  expect(response.cookies.get("session.0")).toMatchObject({ value: "synthetic-0", secure: true, sameSite: "lax" });
  expect(response.cookies.get("session.1")?.value).toBe("synthetic-1");
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect(response.headers.get("Expires")).toBe("0");
  expect(response.headers.get("Pragma")).toBe("no-cache");
  expect(mocks.getUser).toHaveBeenCalledTimes(1);
});

it("keeps page refresh failures safe and never redirects or creates a new account", async () => {
  mocks.getUser.mockRejectedValue(new Error("synthetic-secret"));
  const response = await refreshSession(new NextRequest("https://soraban.test/"));
  expect(response.status).toBe(200);
  expect(response.headers.get("Location")).toBeNull();
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect(await response.text()).not.toContain("synthetic-secret");
});

it("allows placeholder pages without Supabase configuration", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  expect((await refreshSession(new NextRequest("https://soraban.test/"))).status).toBe(200);
  expect(mocks.create).not.toHaveBeenCalled();
});

it.each([["/", true], ["/play", true], ["/results", true], ["/leaderboard", true], ["/api/health", false], ["/api/session/anonymous", false], ["/_next/static/test.js", false], ["/favicon.ico", false]])("matches %s correctly", (url, expected) => {
  expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(expected);
});
