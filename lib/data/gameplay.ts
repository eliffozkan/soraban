import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GuessRequest } from "../game/contracts";
import { guessDto, myTodayDto, todayDto } from "./gameplay-dto";
import { ApiFailure } from "./http";

const failures: Record<string, { status: number; message: string }> = {
  INVALID_GUESS: { status: 400, message: "Provide a valid question ID and positive number within the allowed maximum." },
  NICKNAME_INVALID: { status: 400, message: "Use 3–20 letters, numbers, spaces, underscores, dots or hyphens, including a letter." },
  INVALID_PAGINATION: { status: 400, message: "Invalid leaderboard pagination." },
  AUTH_REQUIRED: { status: 401, message: "A valid session is required." },
  NICKNAME_REJECTED: { status: 422, message: "This nickname cannot be used." },
  QUESTION_NOT_FOUND: { status: 404, message: "Question not found." },
  EPISODE_NOT_FOUND: { status: 404, message: "Episode not found." },
  DAY_CLOSED: { status: 409, message: "This question is no longer accepting guesses." },
  RATE_LIMITED: { status: 429, message: "Please wait before changing your nickname again." },
};

export async function gameplayRpc<T>(client: SupabaseClient, name: string, args: Record<string, unknown>, parse: (data: unknown) => T): Promise<T> {
  const { data, error } = await client.rpc(name, args);
  if (error) {
    const failure = Object.hasOwn(failures, error.message) ? failures[error.message] : undefined;
    // Never forward database messages/details, missing-relation errors or secrets.
    if (failure && error.code === `PT${failure.status}`) {
      throw new ApiFailure(failure.status, error.message, failure.message);
    }
    throw new ApiFailure(503, "DAY_UNAVAILABLE", "Today's game is temporarily unavailable.");
  }
  return parse(data);
}

export function getToday(client: SupabaseClient) {
  return gameplayRpc(client, "soraban_today", {}, todayDto);
}
export function getMyToday(client: SupabaseClient) {
  return gameplayRpc(client, "soraban_my_today", {}, myTodayDto);
}
export function submitGuess(client: SupabaseClient, input: GuessRequest) {
  // Await PostgREST's committed response; no provisional score or separate insert.
  return gameplayRpc(client, "soraban_submit_guess", { p_question_id: input.questionId, p_guess: input.guess }, guessDto);
}
