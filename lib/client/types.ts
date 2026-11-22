/**
 * SORABAN istemci tipleri.
 *
 * Bu tipler `docs/API_CONTRACT.md` (v0.1, öneri) içindeki şekillerin aynısıdır.
 * Sözleşme değişirse önce belge güncellenir (Elif + Zeynep onayı), sonra burası.
 * "PROPOSAL" ile işaretli tipler sözleşmede henüz tam yazılmamış alanlardır;
 * Elif ile netleştirilmeden gerçek uç noktaya bağlanmamalıdır.
 */

/** Tahmin ve doğru değer için ortak üst sınır (lib/game/scoring.ts ile aynı). */
export const MAX_NUMERIC_VALUE = 1e15;

/** Her gün sabit altı soru pozisyonu vardır. */
export const QUESTIONS_PER_DAY = 6;

export type QuestionState = "unanswered" | "answered" | "void";

/**
 * Sezonun altı kategorisi — PROPOSAL.
 * Neris'in soru kartı ve özet ekranı kategori gösteriyor ama sözleşmede bu alan
 * henüz yok. Elif `QuestionPublic`'e eklemeyi onaylayana kadar alan isteğe
 * bağlıdır: ekranlar varsa gösterir, yoksa gizler. Cevap hakkında bilgi vermez.
 */
export type QuestionCategory =
  | "kampus"
  | "akademik"
  | "yurt-yemek"
  | "tarih-kultur"
  | "eymir-doga"
  | "bilim-topluluklar";

/** Tahminden önce görülebilen tek soru verisi. Cevap/açıklama/kaynak YOK. */
export type QuestionPublic = {
  id: string;
  position: number;
  prompt: string;
  unit: string;
  state: QuestionState;
  /** PROPOSAL (yukarıya bak): sözleşmeye eklenene kadar isteğe bağlı. */
  category?: QuestionCategory;
};

/** Sunucu tahmini kilitledikten SONRA dönen sonuç. */
export type RevealedGuess = {
  questionId: string;
  guess: number;
  /** Ham (yuvarlanmamış) puan. Yalnızca ekranda yuvarlanır. */
  scoreRaw: number;
  correctAnswer: number;
  reasoning: string;
  sourceUrl: string;
};

export type DailyProgress = {
  /** Cevaplanmış, iptal edilmemiş soru sayısı. */
  answeredCount: number;
  totalCount: typeof QUESTIONS_PER_DAY;
  /** İptal edilmemiş tüm sorular cevaplandıysa true. */
  completed: boolean;
  /** Günlük ham puan; gün tamamlanana kadar null. Sunucu hesaplar. */
  scoreRaw: number | null;
};

export type GameDay = {
  id: string;
  number: number;
  /** Sunucunun Europe/Istanbul saatine göre YYYY-MM-DD. */
  date: string;
};

/** POST /api/session/anonymous */
export type GuestSession = {
  status: "ready";
  isAnonymous: boolean;
};

/** GET /api/today */
export type TodayResponse = {
  day: GameDay;
  questions: QuestionPublic[];
  progress: DailyProgress;
};

/** POST /api/guesses gövdesi. Oyuncu kimliği veya puan GÖNDERİLMEZ. */
export type SubmitGuessRequest = {
  questionId: string;
  guess: number;
};

/** POST /api/guesses yanıtı */
export type SubmitGuessResponse = {
  guess: RevealedGuess;
  progress: DailyProgress;
};

/**
 * GET /api/me/today — PROPOSAL.
 * Sözleşme yalnızca "oyuncunun kendi cevapları + ilerleme + gün kimliği" diyor;
 * alan adları Elif ile netleştirilmeli.
 */
export type MyTodayResponse = {
  day: GameDay;
  guesses: RevealedGuess[];
  progress: DailyProgress;
};

export type LeaderboardScope = "daily" | "season";

export type LeaderboardEntry = {
  rank: number;
  nickname: string;
  scoreRaw: number;
  /** Yalnızca sezon tablosunda. */
  playedDays?: number;
  averageScoreRaw?: number;
};

/**
 * GET /api/leaderboard — PROPOSAL.
 * Kararlara göre: takma ad denetimi hazır olana kadar tablo "henüz yok"
 * (unavailable) gösterilir. Eşit ham puanlar aynı sırayı paylaşır.
 */
export type LeaderboardResponse =
  | { scope: LeaderboardScope; status: "unavailable" }
  | { scope: LeaderboardScope; status: "ready"; entries: LeaderboardEntry[] };

/** Sözleşmedeki hata kodları + istemcinin kendi ürettiği kodlar. */
export type ApiErrorCode =
  | "AUTH_REQUIRED" // 401
  | "INVALID_GUESS" // 400
  | "QUESTION_NOT_FOUND" // 404
  | "ALREADY_SUBMITTED" // 409
  | "DAY_CLOSED" // 409
  | "DAY_UNAVAILABLE" // 503
  | "RATE_LIMITED" // 429 — PROPOSAL: isim Elif ile netleşecek
  | "NETWORK_ERROR" // yalnızca istemci: istek hiç ulaşmadı
  | "MALFORMED_RESPONSE"; // yalnızca istemci: yanıt beklenen şekilde değil

/** Sunucunun hata gövdesi. */
export type ApiError = { error: { code: string; message: string } };
