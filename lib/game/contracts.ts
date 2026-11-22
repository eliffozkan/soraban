/** Backend wire types; see docs/API_CONTRACT.md. Frontend-owned types migrate separately. */
export const QUESTION_CATEGORIES = [
  "kampus", "akademik", "yurt-yemek", "tarih-kultur", "eymir-doga", "bilim-topluluklar",
] as const;
export type QuestionCategory = typeof QUESTION_CATEGORIES[number];
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
