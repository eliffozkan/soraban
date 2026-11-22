import "server-only";
import { CATEGORIES } from "../../components/ui/categories";
import {
  type DailyProgress, type GameDay, type GuessResponse, type MyTodayResponse,
  type QuestionPublic, type RevealedGuess, type TodayResponse,
  type Episode, type EpisodesResponse, type EpisodeResponse, type MyEpisodeResponse,
  type Profile, type EpisodeRank, type EpisodeLeaderboard,
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
    if (typeof row.category !== "string" || !Object.hasOwn(CATEGORIES, row.category)) return unavailable();
    result.category = row.category as QuestionPublic["category"];
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
  validatePublicState(result.questions, result.progress);
  return result;
}
function validatePublicState(questions: QuestionPublic[], state: DailyProgress) {
  if (questions.length !== state.totalCount || questions.some((q, i) => q.position !== i + 1)
    || new Set(questions.map(q => q.id)).size !== questions.length) return unavailable();
  const valid = questions.filter(q => q.state !== "void");
  const answered = valid.filter(q => q.state === "answered").length;
  if (!valid.length || answered !== state.answeredCount || state.completed !== (answered === valid.length)) return unavailable();
}
export function myTodayDto(value: unknown): MyTodayResponse {
  const row = object(value);
  return { day: day(row.day), guesses: array(row.guesses, reveal), progress: progress(row.progress) };
}
export function guessDto(value: unknown): GuessResponse {
  const row = object(value);
  return { guess: reveal(row.guess), progress: progress(row.progress) };
}

function episode(value: unknown): Episode {
  const row = object(value);
  if (row.slug !== "demo" && row.slug !== "2026-11-22") return unavailable();
  if (row.date !== (row.slug === "demo" ? null : "2026-11-22")) return unavailable();
  return { id: text(row.id), slug: row.slug, title: text(row.title), date: row.date as string | null,
    totalCount: integer(row.totalCount, 1) };
}
export function episodesDto(value: unknown): EpisodesResponse {
  return { episodes: array(object(value).episodes, episode) };
}
export function episodeDto(value: unknown): EpisodeResponse {
  const row = object(value);
  const meta = episode(row.episode);
  const questions = array(row.questions, question);
  const state = progress(row.progress);
  validatePublicState(questions, state);
  if (state.totalCount !== meta.totalCount) return unavailable();
  return { episode: meta, questions, progress: state };
}
export function myEpisodeDto(value: unknown): MyEpisodeResponse {
  const row = object(value);
  const meta = episode(row.episode);
  const state = progress(row.progress);
  const guesses = array(row.guesses, reveal);
  if (state.totalCount !== meta.totalCount || guesses.length > meta.totalCount
    || new Set(guesses.map(g => g.questionId)).size !== guesses.length) return unavailable();
  return { episode: meta, guesses, progress: state };
}
export function profileDto(value: unknown): Profile {
  const row = object(value);
  if (typeof row.nicknameApproved !== "boolean" || typeof row.nicknameLocked !== "boolean"
    || typeof row.leaderboardHidden !== "boolean") return unavailable();
  const nickname = row.nickname === null ? null : text(row.nickname);
  const displayName = text(row.displayName);
  if ((row.nicknameApproved && (nickname === null || displayName !== nickname))
    || (!row.nicknameApproved && displayName !== "Anonim oyuncu")) return unavailable();
  return { nickname, displayName, nicknameApproved: row.nicknameApproved,
    nicknameLocked: row.nicknameLocked, leaderboardHidden: row.leaderboardHidden };
}
function rank(value: unknown): EpisodeRank {
  const row = object(value);
  return { rank: integer(row.rank, 1), nickname: text(row.nickname), scoreRaw: number(row.scoreRaw, 0, 100) };
}
export function leaderboardDto(value: unknown): EpisodeLeaderboard {
  const row = object(value);
  if (row.status !== "ready") return unavailable();
  const entries = array(row.entries, rank);
  const limit = integer(row.limit, 1);
  const offset = integer(row.offset, 0);
  const totalPlayers = integer(row.totalPlayers, 0);
  if (limit > 100 || offset > 10000 || entries.length > limit || entries.length > totalPlayers) return unavailable();
  return { episode: episode(row.episode), status: "ready", entries,
    me: row.me === null ? null : rank(row.me), totalPlayers, limit, offset };
}
