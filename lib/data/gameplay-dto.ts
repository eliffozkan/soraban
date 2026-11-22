import "server-only";
import {
  QUESTION_CATEGORIES,
  type DailyProgress, type GameDay, type GuessResponse, type MyTodayResponse,
  type QuestionPublic, type RevealedGuess, type TodayResponse,
} from "../game/contracts";
import { DEFAULT_MAX_VALUE } from "../game/scoring";
import { ApiFailure } from "./http";

function unavailable(): never {
  throw new ApiFailure(503, "DAY_UNAVAILABLE", "Today's game is temporarily unavailable.");
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return unavailable();
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return unavailable();
  return value;
}
function number(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) return unavailable();
  return value;
}
function integer(value: unknown, min: number): number {
  const result = number(value, min, Number.MAX_SAFE_INTEGER);
  if (!Number.isInteger(result)) return unavailable();
  return result;
}
function array<T>(value: unknown, parse: (item: unknown) => T): T[] {
  if (!Array.isArray(value)) return unavailable();
  return value.map(parse);
}
function day(value: unknown): GameDay {
  const row = object(value);
  const date = text(row.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return unavailable();
  return { id: text(row.id), number: integer(row.number, 1), date };
}
function progress(value: unknown): DailyProgress {
  const row = object(value);
  const totalCount = integer(row.totalCount, 1);
  const answeredCount = integer(row.answeredCount, 0);
  if (answeredCount > totalCount || typeof row.completed !== "boolean") return unavailable();
  const scoreRaw = row.scoreRaw === null ? null : number(row.scoreRaw, 0, 100);
  if (row.completed !== (scoreRaw !== null)) return unavailable();
  return { answeredCount, totalCount, completed: row.completed, scoreRaw };
}
function question(value: unknown): QuestionPublic {
  const row = object(value);
  if (row.state !== "unanswered" && row.state !== "answered" && row.state !== "void") return unavailable();
  const result: QuestionPublic = {
    id: text(row.id), position: integer(row.position, 1), prompt: text(row.prompt),
    unit: text(row.unit), state: row.state,
  };
  if (row.category !== undefined && row.category !== null) {
    const category = QUESTION_CATEGORIES.find(key => key === row.category);
    if (!category) return unavailable();
    result.category = category;
  }
  return result;
}
function reveal(value: unknown): RevealedGuess {
  const row = object(value);
  const sourceUrl = text(row.sourceUrl);
  if (!sourceUrl.startsWith("https://")) return unavailable();
  return {
    questionId: text(row.questionId), guess: number(row.guess, Number.MIN_VALUE, DEFAULT_MAX_VALUE),
    scoreRaw: number(row.scoreRaw, 0, 100), correctAnswer: number(row.correctAnswer, Number.MIN_VALUE, DEFAULT_MAX_VALUE),
    reasoning: text(row.reasoning), sourceUrl,
  };
}

/** Explicit allowlists: accidentally added private columns cannot reach a DTO. */
export function todayDto(value: unknown): TodayResponse {
  const row = object(value);
  const result = { day: day(row.day), questions: array(row.questions, question), progress: progress(row.progress) };
  if (result.questions.length !== result.progress.totalCount
    || result.questions.some((q, i) => q.position !== i + 1)
    || new Set(result.questions.map(q => q.id)).size !== result.questions.length) return unavailable();
  const valid = result.questions.filter(q => q.state !== "void");
  const answered = valid.filter(q => q.state === "answered").length;
  if (!valid.length || answered !== result.progress.answeredCount
    || result.progress.completed !== (answered === valid.length)) return unavailable();
  return result;
}
export function myTodayDto(value: unknown): MyTodayResponse {
  const row = object(value);
  return { day: day(row.day), guesses: array(row.guesses, reveal), progress: progress(row.progress) };
}
export function guessDto(value: unknown): GuessResponse {
  const row = object(value);
  return { guess: reveal(row.guess), progress: progress(row.progress) };
}
