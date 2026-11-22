import type { Metadata } from "next";
import { GameMain } from "@/components/game/game-main";
import { LeaderboardScreen } from "@/components/game/leaderboard-screen";

export const metadata: Metadata = { title: "Sıralama" };

export default function Page() {
  return (
    <GameMain title="Sıralama">
      <LeaderboardScreen />
    </GameMain>
  );
}
