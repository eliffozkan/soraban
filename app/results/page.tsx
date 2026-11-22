import type { Metadata } from "next";
import { GameMain } from "@/components/game/game-main";
import { ResultsScreen } from "@/components/game/results-screen";

export const metadata: Metadata = { title: "Sonuçlar" };

export default function Page() {
  return (
    <GameMain title="Sonuçlar" hideTitle>
      <ResultsScreen />
    </GameMain>
  );
}
