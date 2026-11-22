import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiFailure } from "../data/http";
import type { SessionReady } from "../game/contracts";

export function authFailure(error: { status?: number } | null): ApiFailure {
  return error?.status === 429
    ? new ApiFailure(429, "AUTH_RATE_LIMITED", "Please wait before trying again.")
    : new ApiFailure(503, "AUTH_UNAVAILABLE", "Authentication is temporarily unavailable.");
}

export async function verifiedUser(client: SupabaseClient) {
  // getUser validates against Auth; never authorize from getSession's cookie data.
  const { data, error } = await client.auth.getUser();
  if (error) {
    if (error.name === "AuthSessionMissingError") return null;
    const invalidSession = [
      "bad_jwt", "session_not_found", "session_expired",
      "refresh_token_not_found", "refresh_token_already_used",
    ].includes(error.code ?? "");
    if (error.status === 401 || error.status === 403 || invalidSession) {
      throw new ApiFailure(401, "AUTH_REQUIRED", "A valid session is required.");
    }
    throw authFailure(error);
  }
  if (!data.user?.id || typeof data.user.is_anonymous !== "boolean") throw authFailure(null);
  return data.user;
}

export async function requireUser(client: SupabaseClient) {
  const user = await verifiedUser(client);
  if (!user) throw new ApiFailure(401, "AUTH_REQUIRED", "A valid session is required.");
  return user;
}

// Bounded process-local backstop, not a distributed/IP limiter. Existing sessions
// do not consume it. Supabase's own limits are also propagated; see backend notes.
let windowStart = 0;
let creations = 0;
function reserveCreation() {
  const now = Date.now();
  if (now - windowStart >= 60_000) {
    windowStart = now;
    creations = 0;
  }
  if (creations >= 20) {
    throw new ApiFailure(429, "AUTH_RATE_LIMITED", "Please wait before trying again.");
  }
  creations += 1;
}

export async function ensureAnonymousSession(client: SupabaseClient): Promise<SessionReady> {
  const existing = await verifiedUser(client);
  if (existing) return { status: "ready", isAnonymous: existing.is_anonymous === true };
  reserveCreation();
  const { data, error } = await client.auth.signInAnonymously();
  if (error) throw authFailure(error);
  if (!data.session || !data.user?.id) throw authFailure(null);
  const user = await requireUser(client);
  if (user.id !== data.user.id || user.is_anonymous !== true) throw authFailure(null);
  return { status: "ready", isAnonymous: true };
}
