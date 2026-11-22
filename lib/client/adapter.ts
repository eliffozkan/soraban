import type {
  GuestSession,
  LeaderboardResponse,
  LeaderboardScope,
  MyTodayResponse,
  SubmitGuessRequest,
  SubmitGuessResponse,
  TodayResponse,
} from "./types";

/**
 * Ekranların konuştuğu tek veri arayüzü.
 *
 * Şimdilik `createMockClient()` kullanılıyor. Elif'in uç noktaları doğrulanınca
 * aynı arayüzü uygulayan bir HTTP adapter yazılır; ekranlar değişmez.
 *
 * Kurallar:
 * - Hatalar her zaman `SorabanClientError` olarak fırlatılır.
 * - İstemci puan HESAPLAMAZ; puanlar sunucudan (veya mock'tan) gelir.
 * - Oyuncu kimliği, puan, tarih asla istekte gönderilmez.
 */
export interface SorabanClient {
  /** POST /api/session/anonymous — oyuna ilk girişte bir kez çağrılır. */
  ensureGuestSession(): Promise<GuestSession>;
  /** GET /api/today — önce ensureGuestSession başarılı olmalı. */
  getToday(): Promise<TodayResponse>;
  /** POST /api/guesses — aynı soru için tekrar çağrı ilk sonucu döndürür. */
  submitGuess(request: SubmitGuessRequest): Promise<SubmitGuessResponse>;
  /** GET /api/me/today — oyuncunun bugünkü kendi sonuçları. */
  getMyToday(): Promise<MyTodayResponse>;
  /** GET /api/leaderboard?scope=... */
  getLeaderboard(scope: LeaderboardScope): Promise<LeaderboardResponse>;
}
