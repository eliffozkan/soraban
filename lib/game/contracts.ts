/** Backend design types. No successful gameplay response is served in Milestone 1. */
export type ApiError = { error: { code: string; message: string } };
export type SessionReady = { status: "ready"; isAnonymous: boolean };
export type GuessRequest = { questionId: string; guess: number };
export type QuestionPublic = {
  id: string;
  position: number;
  prompt: string;
  unit: string;
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
// Dynamic internal count; widening the shared contract's literal 6 needs team review.
export type DailyProgress = {
  answeredCount: number;
  totalCount: number;
  completed: boolean;
  scoreRaw: number | null;
};
export type GameDay = { id: string; number: number; date: string };
export type TodayResponse = { day: GameDay; questions: QuestionPublic[]; progress: DailyProgress };
export type GuessResponse = { guess: RevealedGuess; progress: DailyProgress };
// /api/me/today's exact response envelope is not yet agreed; reuse these building
// blocks after that review instead of publishing a competing success shape.
