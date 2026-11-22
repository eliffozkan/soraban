import type { NextRequest } from "next/server";
import { refreshSession } from "./lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return refreshSession(request);
}

// API handlers perform their own verification and persist cookies themselves.
export const config = { matcher: ["/", "/play/:path*", "/results/:path*", "/leaderboard/:path*"] };
