/**
 * Gerçek (HTTP) SorabanClient. Elif'in uç noktalarıyla konuşur
 * (docs/API_CONTRACT.md v0.2, PR #9).
 *
 * Kurallar:
 * - Yalnızca aynı kökene (same-origin) istek atar; çerezleri tarayıcı taşır.
 *   Token, oyuncu kimliği, puan veya tarih ASLA gönderilmez.
 * - Yanıtlar önbelleğe alınmaz (`cache: "no-store"`).
 * - Her hata `SorabanClientError` olur. Sunucu mesajı ekrana çıkmaz;
 *   ekranlar yalnızca `code` ile karar verir.
 * - Sunucudan gelen veri, ekranlara gitmeden önce şekil olarak kontrol edilir.
 *   Beklenmeyen bir şekil `MALFORMED_RESPONSE` olur. Fazla alanlar atılır.
 */
import type { SorabanClient } from "./adapter";
import { SorabanClientError } from "./errors";
import {
  QUESTIONS_PER_DAY,
  type ApiErrorCode,
  type DailyProgress,
  type GameDay,
  type GuestSession,
  type LeaderboardScope,
  type MyTodayResponse,
  type QuestionPublic,
  type QuestionState,
  type RevealedGuess,
  type SubmitGuessResponse,
  type TodayResponse,
} from "./types";
import { CATEGORIES, type CategoryKey } from "../../components/ui/categories";

export type HttpClientOptions = {
  /** Testler için. Varsayılan: "" (aynı köken, örn. "/api/today"). */
  baseUrl?: string;
  /** Testler için sahte fetch. Varsayılan: tarayıcının fetch'i. */
  fetch?: typeof fetch;
  /** Bir isteğin en fazla bekleme süresi (ms). Varsayılan 15000. */
  timeoutMs?: number;
};

/** Sunucunun hata kodu → istemci kodu. Listede olmayan kodlar HTTP durumuna göre eşlenir. */
const SERVER_CODES: Record<string, ApiErrorCode> = {
  AUTH_REQUIRED: "AUTH_REQUIRED",
  INVALID_GUESS: "INVALID_GUESS",
  QUESTION_NOT_FOUND: "QUESTION_NOT_FOUND",
  ALREADY_SUBMITTED: "ALREADY_SUBMITTED",
  DAY_CLOSED: "DAY_CLOSED",
  DAY_UNAVAILABLE: "DAY_UNAVAILABLE",
  RATE_LIMITED: "RATE_LIMITED",
  AUTH_RATE_LIMITED: "RATE_LIMITED",
  AUTH_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  ORIGIN_FORBIDDEN: "ORIGIN_FORBIDDEN",
};

function codeFromStatus(status: number): ApiErrorCode {
  if (status === 401) return "AUTH_REQUIRED";
  if (status === 403) return "ORIGIN_FORBIDDEN";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "SERVICE_UNAVAILABLE";
  return "MALFORMED_RESPONSE";
}

/** Kısa, güvenli Türkçe mesajlar. Sunucunun metni kullanılmaz. */
const MESSAGES: Record<ApiErrorCode, string> = {
  AUTH_REQUIRED: "Oturum bulunamadı.",
  INVALID_GUESS: "Geçerli bir pozitif sayı gir.",
  QUESTION_NOT_FOUND: "Soru bulunamadı.",
  ALREADY_SUBMITTED: "Bu soruya zaten cevap verdin.",
  DAY_CLOSED: "Bu soru artık tahmin kabul etmiyor.",
  DAY_UNAVAILABLE: "Bugünün soruları henüz hazır değil.",
  RATE_LIMITED: "Çok fazla istek. Biraz sonra tekrar dene.",
  SERVICE_UNAVAILABLE: "Servis geçici olarak kullanılamıyor.",
  ORIGIN_FORBIDDEN: "İstek reddedildi.",
  NETWORK_ERROR: "Bağlantı kurulamadı.",
  MALFORMED_RESPONSE: "Sunucudan beklenmeyen bir yanıt geldi.",
};

function fail(code: ApiErrorCode, status?: number): never {
  throw new SorabanClientError(code, MESSAGES[code], status);
}

// ---------------------------------------------------------------------------
// Yanıt kontrolleri. Biri tutmazsa MALFORMED_RESPONSE.
// ---------------------------------------------------------------------------

function bad(): never {
  return fail("MALFORMED_RESPONSE");
}
function obj(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return bad();
  return value as Record<string, unknown>;
}
function str(value: unknown): string {
  return typeof value === "string" ? value : bad();
}
function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : bad();
}
function bool(value: unknown): boolean {
  return typeof value === "boolean" ? value : bad();
}
function list<T>(value: unknown, parse: (item: unknown) => T): T[] {
  return Array.isArray(value) ? value.map(parse) : bad();
}

function parseDay(value: unknown): GameDay {
  const row = obj(value);
  return { id: str(row.id), number: num(row.number), date: str(row.date) };
}

function parseProgress(value: unknown): DailyProgress {
  const row = obj(value);
  // Sözleşme: günde tam beş soru. Başka bir sayı gelirse ekranlar yanlış çizer.
  if (row.totalCount !== QUESTIONS_PER_DAY) return bad();
  return {
    answeredCount: num(row.answeredCount),
    totalCount: QUESTIONS_PER_DAY,
    completed: bool(row.completed),
    scoreRaw: row.scoreRaw === null ? null : num(row.scoreRaw),
  };
}

const STATES: readonly QuestionState[] = ["unanswered", "answered", "void"];

function parseQuestion(value: unknown): QuestionPublic {
  const row = obj(value);
  const state = str(row.state) as QuestionState;
  if (!STATES.includes(state)) return bad();
  const question: QuestionPublic = {
    id: str(row.id),
    position: num(row.position),
    prompt: str(row.prompt),
    unit: str(row.unit),
    state,
  };
  // Kategori isteğe bağlı. Bilinmeyen bir anahtar gelirse göstermeyiz (hata değil).
  if (typeof row.category === "string" && Object.hasOwn(CATEGORIES, row.category)) {
    question.category = row.category as CategoryKey;
  }
  return question;
}

function parseReveal(value: unknown): RevealedGuess {
  const row = obj(value);
  return {
    questionId: str(row.questionId),
    guess: num(row.guess),
    scoreRaw: num(row.scoreRaw),
    correctAnswer: num(row.correctAnswer),
    reasoning: str(row.reasoning),
    sourceUrl: str(row.sourceUrl),
  };
}

function parseSession(value: unknown): GuestSession {
  const row = obj(value);
  if (row.status !== "ready") return bad();
  return { status: "ready", isAnonymous: bool(row.isAnonymous) };
}

function parseToday(value: unknown): TodayResponse {
  const row = obj(value);
  return {
    day: parseDay(row.day),
    questions: list(row.questions, parseQuestion),
    progress: parseProgress(row.progress),
  };
}

function parseGuess(value: unknown): SubmitGuessResponse {
  const row = obj(value);
  return { guess: parseReveal(row.guess), progress: parseProgress(row.progress) };
}

function parseMyToday(value: unknown): MyTodayResponse {
  const row = obj(value);
  return {
    day: parseDay(row.day),
    guesses: list(row.guesses, parseReveal),
    progress: parseProgress(row.progress),
  };
}

// ---------------------------------------------------------------------------

export function createHttpClient(options: HttpClientOptions = {}): SorabanClient {
  const baseUrl = options.baseUrl ?? "";
  const timeoutMs = options.timeoutMs ?? 15_000;

  async function request<T>(
    method: "GET" | "POST",
    path: string,
    parse: (data: unknown) => T,
    body?: unknown,
  ): Promise<T> {
    // fetch'i çağrı anında alırız; testler globalThis.fetch'i değiştirebilir.
    const doFetch = options.fetch ?? globalThis.fetch;
    let response: Response;
    try {
      response = await doFetch(`${baseUrl}${path}`, {
        method,
        credentials: "same-origin",
        cache: "no-store",
        headers:
          body === undefined
            ? { Accept: "application/json" }
            : { Accept: "application/json", "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      // Ağ kopukluğu, zaman aşımı, iptal: istek sunucuya ulaşmadı (veya cevap gelmedi).
      return fail("NETWORK_ERROR");
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = undefined;
    }

    if (!response.ok) {
      const serverCode =
        data && typeof data === "object" && "error" in data
          ? (data as { error?: { code?: unknown } }).error?.code
          : undefined;
      const code =
        typeof serverCode === "string" && Object.hasOwn(SERVER_CODES, serverCode)
          ? SERVER_CODES[serverCode]
          : codeFromStatus(response.status);
      return fail(code, response.status);
    }

    if (data === undefined) return fail("MALFORMED_RESPONSE", response.status);
    return parse(data);
  }

  return {
    ensureGuestSession() {
      return request("POST", "/api/session/anonymous", parseSession);
    },

    getToday() {
      return request("GET", "/api/today", parseToday);
    },

    submitGuess({ questionId, guess }) {
      // Yalnızca bu iki alan gönderilir; sunucu fazla alanı reddeder.
      return request("POST", "/api/guesses", parseGuess, { questionId, guess });
    },

    getMyToday() {
      return request("GET", "/api/me/today", parseMyToday);
    },

    async getLeaderboard(scope: LeaderboardScope) {
      // GET /api/leaderboard henüz yok (sözleşme: "deferred"). Karar gereği tablo
      // "henüz yok" gösterilir. Uç nokta eklenince burada istek atılacak.
      return { scope, status: "unavailable" };
    },
  };
}
