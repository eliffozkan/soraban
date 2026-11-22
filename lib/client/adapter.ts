import type {
  EpisodeLeaderboardResponse,
  EpisodeResponse,
  EpisodeSlug,
  GuestSession,
  MyEpisodeResponse,
  NicknameResponse,
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
  /** GET /api/leaderboard?scope=... — 30 günlük sezon için (şimdilik kullanılmıyor). */
  getLeaderboard(scope: LeaderboardScope): Promise<LeaderboardResponse>;

  // --- Bölümler (PROPOSAL, Elif ile netleşecek) ---
  /** GET /api/episodes/{slug} — bölümün herkese açık soruları + bu oyuncunun ilerlemesi. */
  getEpisode(slug: EpisodeSlug): Promise<EpisodeResponse>;
  /** GET /api/episodes/{slug}/me — bu oyuncunun o bölümdeki kilitli tahminleri. */
  getMyEpisode(slug: EpisodeSlug): Promise<MyEpisodeResponse>;
  /** GET /api/episodes/{slug}/leaderboard — yalnızca o bölümü tamamlayanlar. */
  getEpisodeLeaderboard(slug: EpisodeSlug): Promise<EpisodeLeaderboardResponse>;
  /** GET /api/me/nickname */
  getNickname(): Promise<NicknameResponse>;
  /** POST /api/me/nickname — sunucu doğrular, uygunsuzsa NICKNAME_REJECTED. */
  setNickname(nickname: string): Promise<NicknameResponse>;
}
