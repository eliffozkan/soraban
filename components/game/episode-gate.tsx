"use client";

import { useRouter } from "next/navigation";
import { Button, StatusState } from "@/components/ui";
import { LeaderboardScreen } from "./leaderboard-screen";
import { PlayScreen } from "./play-screen";
import { ResultsScreen } from "./results-screen";
import { useEpisodeChoice } from "./use-episode";

const SCREENS = { play: PlayScreen, results: ResultsScreen, leaderboard: LeaderboardScreen };

/**
 * Sayfanın bölümünü bulur (URL → son seçilen bölüm) ve ekranı o bölümle çizer.
 * Bölüm yoksa ana sayfaya yönlendiren bir mesaj gösterir.
 */
export function EpisodeGate({ param, screen }: { param?: string; screen: keyof typeof SCREENS }) {
  const router = useRouter();
  const choice = useEpisodeChoice(param);

  if (choice.status === "pending") {
    return <StatusState kind="loading" title="Bölüm açılıyor…" />;
  }
  if (choice.status === "none") {
    return (
      <StatusState
        kind="empty"
        title="Önce bir bölüm seç"
        message="Demo ya da 22 Kasım bölümünü ana sayfadan seçebilirsin."
        action={<Button onClick={() => router.push("/")}>Bölüm seç</Button>}
      />
    );
  }
  const Screen = SCREENS[screen];
  // key: bölüm değişince ekranın durumu sıfırlanır (bölümler karışmaz).
  return <Screen key={choice.slug} slug={choice.slug} />;
}
