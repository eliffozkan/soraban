"use client";

import { useEffect, useSyncExternalStore } from "react";
import { isEpisodeSlug, type EpisodeSlug } from "@/lib/client";
import { readStoredEpisode, storeEpisode, subscribeStorage } from "./episode-storage";
import { EPISODE_PARAM } from "./episode-param";

export function episodeHref(path: "/play" | "/results" | "/leaderboard", slug: EpisodeSlug): string {
  return `${path}?${EPISODE_PARAM}=${encodeURIComponent(slug)}`;
}

export type EpisodeChoice =
  | { status: "pending" } // sunucuda çiziliyor; tarayıcı depolaması henüz okunmadı
  | { status: "none" } // geçerli bölüm yok: ana sayfaya yönlendirilmeli
  | { status: "ready"; slug: EpisodeSlug };

const PENDING: EpisodeChoice = { status: "pending" };

/**
 * Ekranın hangi bölümü göstereceğini bulur:
 * 1. URL'de geçerli `?bolum=` varsa o (ve "son bölüm" olarak saklanır),
 * 2. yoksa tarayıcıda saklanan son bölüm,
 * 3. o da yoksa "none".
 */
export function useEpisodeChoice(param: string | undefined): EpisodeChoice {
  const fromParam = isEpisodeSlug(param) ? param : null;

  const stored = useSyncExternalStore(subscribeStorage, readStoredEpisode, () => undefined);

  useEffect(() => {
    if (fromParam) storeEpisode(fromParam);
  }, [fromParam]);

  if (fromParam) return { status: "ready", slug: fromParam };
  if (stored === undefined) return PENDING;
  return stored ? { status: "ready", slug: stored } : { status: "none" };
}
