/**
 * Oyunda açık olan bölümler. Burada yalnızca herkese açık bilgi vardır
 * (ad, tarih); soru veya cevap ASLA bu dosyaya yazılmaz.
 * 30 günlük sezon desteği ayrı kalır (getToday / getLeaderboard("season")).
 */
import type { Episode, EpisodeSlug } from "./types";

export const EPISODES: readonly Episode[] = [
  { slug: "demo", kind: "demo", title: "Demo", date: null },
  { slug: "2026-11-22", kind: "dated", title: "22 Kasım", date: "2026-11-22" },
];

export function isEpisodeSlug(value: unknown): value is EpisodeSlug {
  return typeof value === "string" && EPISODES.some((e) => e.slug === value);
}

export function episodeBySlug(slug: EpisodeSlug): Episode {
  // EpisodeSlug yalnızca EPISODES içindeki değerlerdir; bulunmama durumu olamaz.
  return EPISODES.find((e) => e.slug === slug) as Episode;
}
