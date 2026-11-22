import "server-only";

import { unstable_rethrow } from "next/navigation";
import type { ApiError } from "../game/contracts";

export class ApiFailure extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

// Apply even on errors and responses without a cookie write.
export function preventCaching(headers: Headers) {
  headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
}

export async function apiResponse(action: () => Promise<unknown>) {
  let response: Response;
  try {
    response = Response.json(await action());
  } catch (error) {
    unstable_rethrow(error);
    const failure = error instanceof ApiFailure
      ? error
      : new ApiFailure(503, "SERVICE_UNAVAILABLE", "Service is temporarily unavailable.");
    const body: ApiError = { error: { code: failure.code, message: failure.message } };
    response = Response.json(body, { status: failure.status });
    if (failure.status === 429) response.headers.set("Retry-After", "60");
  }
  preventCaching(response.headers);
  return response;
}

export function requireSameOrigin(request: Request) {
  const forbidden = () => new ApiFailure(403, "ORIGIN_FORBIDDEN", "A same-origin request is required.");
  const origin = request.headers.get("Origin");
  const site = request.headers.get("Sec-Fetch-Site");
  // Next can reconstruct request.url with its internal listener hostname. Host
  // identifies the browser's target; do not accept arbitrary forwarded-host lists.
  const target = new URL(request.url);
  const host = request.headers.get("Host") ?? target.host;
  let expectedOrigin: string;
  try {
    if (!host || /[\s/\\@?#,]/.test(host)) throw forbidden();
    expectedOrigin = new URL(`${target.protocol}//${host}`).origin;
  } catch {
    throw forbidden();
  }
  if (origin !== expectedOrigin || (site && site !== "same-origin" && site !== "none")) {
    throw forbidden();
  }
}
