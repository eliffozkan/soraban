/**
 * SORABAN istemci tipleri.
 *
 * Bu tipler `docs/API_CONTRACT.md` (v0.1, öneri) içindeki şekillerin aynısıdır.
 * Sözleşme değişirse önce belge güncellenir (Elif + Zeynep onayı), sonra burası.
 * "PROPOSAL" ile işaretli tipler sözleşmede henüz tam yazılmamış alanlardır;
 * Elif ile netleştirilmeden gerçek uç noktaya bağlanmamalıdır.
 */

import type { CategoryKey } from "../../components/ui/categories";

/** Tahmin ve doğru değer için ortak üst sınır (lib/game/scoring.ts ile aynı). */
export const MAX_NUMERIC_VALUE = 1e15;

/** Her gün sabit beş soru pozisyonu vardır (ekip kararı, 22 Kasım 2026). */
export const QUESTIONS_PER_DAY = 5;

export type QuestionState = "unanswered" | "answered" | "void";

/** Tahminden önce görülebilen tek soru verisi. Cevap/açıklama/kaynak YOK. */
export type QuestionPublic = {
  id: string;
  position: number;
  prompt: string;
  unit: string;
  state: QuestionState;
  /**
   * Sorunun kategorisi (onaylandı, 22 Kasım 2026). İsteğe bağlı: yoksa arayüz
   * kategori göstermez. Tek kategori listesi Neris'in components/ui/categories.ts dosyasıdır.
   */
  category?: CategoryKey;
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

// ---------------------------------------------------------------------------
// Bölümler (episodes) — PROPOSAL, Elif ile netleştirilecek (22 Kasım 2026).
// İki bağımsız bölüm: "demo" (takvimden bağımsız) ve "2026-11-22" (tarihli ODTÜ
// bölümü). İlerleme, puan ve sıralama bölümler arasında ASLA karışmaz.
// ---------------------------------------------------------------------------

export type EpisodeKind = "demo" | "dated";

/** Bölüm kimliği (URL'de `?bolum=` değeri). */
export type EpisodeSlug = "demo" | "2026-11-22";

export type Episode = {
  slug: EpisodeSlug;
  kind: EpisodeKind;
  /** Ekranda görünen ad, örn. "Demo" veya "22 Kasım". */
  title: string;
  /** Tarihli bölüm için YYYY-MM-DD; demo için null. */
  date: string | null;
};

/** GET /api/episodes/{slug} — PROPOSAL. Cevap/açıklama/kaynak YOK. */
export type EpisodeResponse = {
  episode: Episode;
  questions: QuestionPublic[];
  progress: DailyProgress;
};

/** GET /api/episodes/{slug}/me — PROPOSAL. Yalnızca bu oyuncunun kilitli tahminleri. */
export type MyEpisodeResponse = {
  episode: Episode;
  guesses: RevealedGuess[];
  progress: DailyProgress;
};

export type EpisodeLeaderboardEntry = {
  rank: number;
  /** Sunucunun onayladığı takma ad ya da sunucunun verdiği yedek ad. */
  nickname: string;
  scoreRaw: number;
  /** Bu satır isteği yapan oyuncuya mı ait? (Kimlik göndermeden "sen" vurgusu.) */
  isMe: boolean;
};

/**
 * GET /api/episodes/{slug}/leaderboard — PROPOSAL.
 * Yalnızca bölümü tamamlayan oyuncular. Eşit ham puan aynı sırayı paylaşır.
 * Kullanıcı kimliği, token, e-posta YOK.
 */
export type EpisodeLeaderboardResponse = {
  episode: Episode;
  entries: EpisodeLeaderboardEntry[];
  /** Tamamlayan oyuncu sayısı (liste kısaltılmış olabilir). */
  playerCount: number;
  /** Bu oyuncu bölümü tamamladıysa sırası; yoksa null. */
  me: { rank: number; scoreRaw: number } | null;
};

/** GET /api/me/nickname ve POST /api/me/nickname yanıtı — PROPOSAL. */
export type NicknameResponse = {
  /** null: oyuncu takma ad seçmedi; sıralamada sunucunun yedek adı görünür. */
  nickname: string | null;
};

/** Sözleşmedeki hata kodları + istemcinin kendi ürettiği kodlar. */
export type ApiErrorCode =
  | "AUTH_REQUIRED" // 401
  | "INVALID_GUESS" // 400
  | "QUESTION_NOT_FOUND" // 404
  | "ALREADY_SUBMITTED" // 409
  | "DAY_CLOSED" // 409
  | "DAY_UNAVAILABLE" // 503 — bölüm/gün yayında değil
  | "EPISODE_NOT_FOUND" // 404 — PROPOSAL: bilinmeyen bölüm
  | "NICKNAME_INVALID" // 400 — PROPOSAL: uzunluk/karakter kuralı
  | "NICKNAME_REJECTED" // 422 — PROPOSAL: uygunsuz takma ad
  | "RATE_LIMITED" // 429 — sunucuda AUTH_RATE_LIMITED olarak gelir
  | "SERVICE_UNAVAILABLE" // 503 — sunucunun AUTH_UNAVAILABLE / SERVICE_UNAVAILABLE kodları
  | "ORIGIN_FORBIDDEN" // 403 — istek aynı kökenden gelmedi (yapılandırma hatası)
  | "NETWORK_ERROR" // yalnızca istemci: istek hiç ulaşmadı
  | "MALFORMED_RESPONSE"; // yalnızca istemci: yanıt beklenen şekilde değil

/** Sunucunun hata gövdesi. */
export type ApiError = { error: { code: string; message: string } };
