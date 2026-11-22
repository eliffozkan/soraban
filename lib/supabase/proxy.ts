import "server-only";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { preventCaching } from "../data/http";
import { getSupabasePublicConfig } from "./config";

/** Refresh only; handlers independently authorize. Never create an account here. */
export async function refreshSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  preventCaching(response.headers);
  try {
    const { url, key } = getSupabasePublicConfig();
    const client = createServerClient(url, key, {
      cookieOptions: { sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          const previous = response;
          response = NextResponse.next({ request });
          previous.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
          previous.headers.forEach((value, name) => {
            if (name === "cache-control" || name === "expires" || name === "pragma") response.headers.set(name, value);
          });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
        },
      },
    });
    await client.auth.getUser();
  } catch {
    // Pages can still render their loading/error states. API calls verify afresh
    // and fail closed; an outage must never sign the visitor in as someone new.
  }
  preventCaching(response.headers);
  return response;
}
