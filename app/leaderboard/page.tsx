import type { Metadata } from "next";
import { EpisodeRoute } from "@/components/game/episode-route";
import { GameMain } from "@/components/game/game-main";

export const metadata: Metadata = { title: "Sıralama" };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <GameMain title="Sıralama">
      <EpisodeRoute searchParams={searchParams} screen="leaderboard" />
    </GameMain>
  );
}
