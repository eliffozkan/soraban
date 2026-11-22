import type { Metadata } from "next";
import { EpisodeRoute } from "@/components/game/episode-route";
import { GameMain } from "@/components/game/game-main";

export const metadata: Metadata = { title: "Sorular" };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <GameMain title="Sorular" hideTitle>
      <EpisodeRoute searchParams={searchParams} screen="play" />
    </GameMain>
  );
}
