import type { GuessRequest } from "./contracts";
import { DEFAULT_MAX_VALUE } from "./scoring";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseGuessRequest(value: unknown): GuessRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (
    Object.keys(body).length !== 2 ||
    !Object.hasOwn(body, "questionId") ||
    !Object.hasOwn(body, "guess")
  ) return null;
  if (typeof body.questionId !== "string" || !uuid.test(body.questionId)) return null;
  if (
    typeof body.guess !== "number" ||
    !Number.isFinite(body.guess) ||
    body.guess <= 0 ||
    body.guess > DEFAULT_MAX_VALUE
  ) return null;
  return { questionId: body.questionId, guess: body.guess };
}
