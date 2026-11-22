import { beforeEach, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

beforeEach(() => { vi.resetModules(); });

it("bounds creation attempts per process, resets the window, and permits existing sessions", async () => {
  const { ensureAnonymousSession } = await import("../../lib/supabase/session");
  const now = vi.spyOn(Date, "now").mockReturnValue(100_000);
  const getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: { name: "AuthSessionMissingError" } });
  const signInAnonymously = vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: { status: 500 } });
  const client = { auth: { getUser, signInAnonymously } } as unknown as SupabaseClient;
  try {
    for (let i = 0; i < 20; i++) await expect(ensureAnonymousSession(client)).rejects.toMatchObject({ status: 503 });
    await expect(ensureAnonymousSession(client)).rejects.toMatchObject({ status: 429, code: "AUTH_RATE_LIMITED" });
    expect(signInAnonymously).toHaveBeenCalledTimes(20);
    getUser.mockResolvedValueOnce({ data: { user: { id: "synthetic", is_anonymous: false } }, error: null });
    expect(await ensureAnonymousSession(client)).toEqual({ status: "ready", isAnonymous: false });
    now.mockReturnValue(160_000);
    await expect(ensureAnonymousSession(client)).rejects.toMatchObject({ status: 503 });
    expect(signInAnonymously).toHaveBeenCalledTimes(21);
  } finally { now.mockRestore(); }
});
