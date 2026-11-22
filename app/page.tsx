import { GameMain } from "@/components/game/game-main";
import { HomeScreen } from "@/components/game/home-screen";

export default function Home() {
  return (
    <GameMain title="SORABAN: ODTÜ hakkında günlük sayı tahmin oyunu" hideTitle>
      <HomeScreen />
    </GameMain>
  );
}
