/** Backend wire types; see docs/API_CONTRACT.md. Frontend-owned types migrate separately. */
import type { CategoryKey } from "../../components/ui/categories";
export type QuestionCategory = CategoryKey;
export type ApiError = { error: { code: string; message: string } };
export type SessionReady = { status: "ready"; isAnonymous: boolean };
export type GuessRequest = { questionId: string; guess: number };
export type QuestionPublic = {
  id: string;
  position: number;
  prompt: string;
  unit: string;
  category?: QuestionCategory;
  state: "unanswered" | "answered" | "void";
};
export type RevealedGuess = {
  questionId: string;
  guess: number;
  scoreRaw: number;
  correctAnswer: number;
  reasoning: string;
  sourceUrl: string;
};
// Total published positions; completion/answeredCount exclude void questions.
export type DailyProgress = {
  answeredCount: number;
  totalCount: number;
  completed: boolean;
  scoreRaw: number | null;
};
export type GameDay = { id: string; number: number; date: string };
export type TodayResponse = { day: GameDay; questions: QuestionPublic[]; progress: DailyProgress };
export type GuessResponse = { guess: RevealedGuess; progress: DailyProgress };
export type MyTodayResponse = { day: GameDay; guesses: RevealedGuess[]; progress: DailyProgress };
export type EpisodeSlug = "demo" | "2026-11-22";
export type Episode = { id: string; slug: EpisodeSlug; title: string; date: string | null; totalCount: number };
export type EpisodesResponse = { episodes: Episode[] };
export type EpisodeResponse = { episode: Episode; questions: QuestionPublic[]; progress: DailyProgress };
export type MyEpisodeResponse = { episode: Episode; guesses: RevealedGuess[]; progress: DailyProgress };
export type Profile = {
  nickname: string | null; displayName: string; nicknameApproved: boolean;
  nicknameLocked: boolean; leaderboardHidden: boolean;
};
export type EpisodeRank = { rank: number; nickname: string; scoreRaw: number };
export type EpisodeLeaderboard = {
  episode: Episode; status: "ready"; entries: EpisodeRank[]; me: EpisodeRank | null;
  totalPlayers: number; limit: number; offset: number;
};
