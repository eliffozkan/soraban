import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GuessRequest } from "../game/contracts";
import { guessDto, myTodayDto, todayDto } from "./gameplay-dto";
import { ApiFailure } from "./http";

const failures: Record<string, { code: string; message: string }> = {
  PT400: { code: "INVALID_GUESS", message: "Provide a valid question ID and positive number within the allowed maximum." },
  PT401: { code: "AUTH_REQUIRED", message: "A valid session is required." },
  PT404: { code: "QUESTION_NOT_FOUND", message: "Question not found." },
  PT409: { code: "DAY_CLOSED", message: "This question is no longer accepting guesses." },
};

async function rpc<T>(client: SupabaseClient, name: string, args: Record<string, unknown>, parse: (data: unknown) => T): Promise<T> {
  const { data, error } = await client.rpc(name, args);
  if (error) {
    const failure = failures[error.code];
    // Never forward database messages/details, missing-relation errors or secrets.
    if (failure && error.message === failure.code) {
      throw new ApiFailure(Number(error.code.slice(2)), failure.code, failure.message);
    }
    throw new ApiFailure(503, "DAY_UNAVAILABLE", "Today's game is temporarily unavailable.");
  }
  return parse(data);
}

export function getToday(client: SupabaseClient) {
  return rpc(client, "soraban_today", {}, todayDto);
}
export function getMyToday(client: SupabaseClient) {
  return rpc(client, "soraban_my_today", {}, myTodayDto);
}
export function submitGuess(client: SupabaseClient, input: GuessRequest) {
  // Await PostgREST's committed response; no provisional score or separate insert.
  return rpc(client, "soraban_submit_guess", { p_question_id: input.questionId, p_guess: input.guess }, guessDto);
}
