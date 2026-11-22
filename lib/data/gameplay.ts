import "server-only";
import { ApiFailure } from "./http";

/** Deliberate gate: schema/RPC execution and database permission tests are pending. */
export function requireGameplayRepository(): never {
  throw new ApiFailure(503, "DAY_UNAVAILABLE", "Gameplay is not available yet.");
}
