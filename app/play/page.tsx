import type { Metadata } from "next";
import { GameMain } from "@/components/game/game-main";
import { PlayScreen } from "@/components/game/play-screen";

export const metadata: Metadata = { title: "Günün soruları" };

export default function Page() {
  return (
    <GameMain title="Günün soruları" hideTitle>
      <PlayScreen />
    </GameMain>
  );
}
