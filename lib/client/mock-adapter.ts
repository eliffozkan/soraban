/**
 * Sahte (mock) SorabanClient. Yalnızca ÖRNEK veri kullanır; ağa çıkmaz,
 * tarayıcı depolamasına yazmaz. Her `createMockClient()` çağrısı kendi
 * bellek içi durumuyla başlar (sayfa yenilenince sıfırlanır).
 */
import type { SorabanClient } from "./adapter";
import { SorabanClientError } from "./errors";
import {
  MOCK_DAILY_SCORE_RAW,
  MOCK_DAY,
  MOCK_QUESTIONS,
  type MockQuestionFixture,
} from "./mock-data";
import {
  MAX_NUMERIC_VALUE,
  QUESTIONS_PER_DAY,
  type DailyProgress,
  type LeaderboardScope,
  type QuestionPublic,
  type RevealedGuess,
  type SubmitGuessRequest,
} from "./types";

/**
 * Ekranların farklı durumlarını denemek için senaryolar:
 * - "normal": altı soru, her şey yolunda
 * - "with-void": 4. soru iptal edilmiş (void)
 * - "day-unavailable": bugünün soruları yayınlanmamış (503)
 * - "rate-limited": oturum açma isteği sınırlandı (429)
 * - "network-error": oturum açma isteği ağa ulaşamadı
 */
export type MockScenario =
  | "normal"
  | "with-void"
  | "day-unavailable"
  | "rate-limited"
  | "network-error";

export type MockClientOptions = {
  scenario?: MockScenario;
  /** Yükleniyor durumlarını görmek için yapay gecikme (ms). Varsayılan 0. */
  latencyMs?: number;
};

const VOID_QUESTION_ID = "ornek-soru-4";

export function createMockClient(options: MockClientOptions = {}): SorabanClient {
  const scenario = options.scenario ?? "normal";
  const latencyMs = options.latencyMs ?? 0;

  let sessionReady = false;
  const submitted = new Map<string, RevealedGuess>();

  const isVoid = (q: MockQuestionFixture) =>
    scenario === "with-void" && q.id === VOID_QUESTION_ID;

  async function wait() {
    if (latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, latencyMs));
  }

  function requireSession() {
    if (!sessionReady) {
      throw new SorabanClientError("AUTH_REQUIRED", "Oturum bulunamadı.", 401);
    }
  }

  function requireDay() {
    if (scenario === "day-unavailable") {
      throw new SorabanClientError("DAY_UNAVAILABLE", "Bugünün soruları henüz hazır değil.", 503);
    }
  }

  function progress(): DailyProgress {
    const valid = MOCK_QUESTIONS.filter((q) => !isVoid(q));
    const answeredCount = valid.filter((q) => submitted.has(q.id)).length;
    const completed = answeredCount === valid.length;
    return {
      answeredCount,
      totalCount: QUESTIONS_PER_DAY,
      completed,
      // ÖRNEK hazır değer; mock ortalama HESAPLAMAZ.
      scoreRaw: completed ? MOCK_DAILY_SCORE_RAW : null,
    };
  }

  function toPublic(q: MockQuestionFixture): QuestionPublic {
    return {
      id: q.id,
      position: q.position,
      prompt: q.prompt,
      unit: q.unit,
      state: isVoid(q) ? "void" : submitted.has(q.id) ? "answered" : "unanswered",
    };
  }

  return {
    async ensureGuestSession() {
      await wait();
      if (scenario === "rate-limited") {
        throw new SorabanClientError("RATE_LIMITED", "Çok fazla istek. Biraz sonra tekrar dene.", 429);
      }
      if (scenario === "network-error") {
        throw new SorabanClientError("NETWORK_ERROR", "Bağlantı kurulamadı.");
      }
      // Tekrar çağrılınca yeni oyuncu oluşmaz; aynı oturum kullanılır.
      sessionReady = true;
      return { status: "ready", isAnonymous: true };
    },

    async getToday() {
      await wait();
      requireSession();
      requireDay();
      return {
        day: { ...MOCK_DAY },
        questions: MOCK_QUESTIONS.map(toPublic),
        progress: progress(),
      };
    },

    async submitGuess({ questionId, guess }: SubmitGuessRequest) {
      await wait();
      requireSession();
      requireDay();
      if (
        typeof guess !== "number" ||
        !Number.isFinite(guess) ||
        guess <= 0 ||
        guess > MAX_NUMERIC_VALUE
      ) {
        throw new SorabanClientError("INVALID_GUESS", "Geçerli bir pozitif sayı gir.", 400);
      }
      const question = MOCK_QUESTIONS.find((q) => q.id === questionId);
      if (!question || isVoid(question)) {
        throw new SorabanClientError("QUESTION_NOT_FOUND", "Soru bulunamadı.", 404);
      }
      // Aynı soruya tekrar gönderim: ilk kaydedilen sonuç döner (yeni deneme yok).
      const existing = submitted.get(questionId);
      if (existing) return { guess: { ...existing }, progress: progress() };

      const revealed: RevealedGuess = {
        questionId,
        guess,
        scoreRaw: question.cannedScoreRaw,
        correctAnswer: question.correctAnswer,
        reasoning: question.reasoning,
        sourceUrl: question.sourceUrl,
      };
      submitted.set(questionId, revealed);
      return { guess: { ...revealed }, progress: progress() };
    },

    async getMyToday() {
      await wait();
      requireSession();
      requireDay();
      return {
        day: { ...MOCK_DAY },
        guesses: MOCK_QUESTIONS.flatMap((q) => {
          const result = submitted.get(q.id);
          return result ? [{ ...result }] : [];
        }),
        progress: progress(),
      };
    },

    async getLeaderboard(scope: LeaderboardScope) {
      await wait();
      // Takma ad denetimi hazır olana kadar karar: tablo "henüz yok".
      return { scope, status: "unavailable" };
    },
  };
}
