import { Suspense } from "react";
import { StatusState } from "@/components/ui";
import { EpisodeGate } from "./episode-gate";
import { EPISODE_PARAM, firstParam } from "./episode-param";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Screen = "play" | "results" | "leaderboard";

async function EpisodeFromParams({ searchParams, screen }: { searchParams: SearchParams; screen: Screen }) {
  const params = await searchParams;
  return <EpisodeGate param={firstParam(params[EPISODE_PARAM])} screen={screen} />;
}

/**
 * Bölümlü sayfaların ortak gövdesi. URL parametresi isteğe göre okunduğu için
 * Suspense içinde beklenir (Next.js 16: sayfanın kalanı önceden çizilebilir).
 */
export function EpisodeRoute({ searchParams, screen }: { searchParams: SearchParams; screen: Screen }) {
  return (
    <Suspense fallback={<StatusState kind="loading" title="Bölüm açılıyor…" />}>
      <EpisodeFromParams searchParams={searchParams} screen={screen} />
    </Suspense>
  );
}
