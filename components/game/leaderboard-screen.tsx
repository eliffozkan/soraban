"use client";

import { useCallback, useState } from "react";
import { Button, LeaderboardTable, StatusState } from "@/components/ui";
import { getSorabanClient, type LeaderboardScope } from "@/lib/client";
import { errorMessage } from "./session";
import { useLoad } from "./use-load";

const TABS: { scope: LeaderboardScope; label: string }[] = [
  { scope: "daily", label: "Bugün" },
  { scope: "season", label: "Sezon" },
];

/** Sıralama: yükleniyor / henüz yok / hata / tablo. */
export function LeaderboardScreen() {
  const [scope, setScope] = useState<LeaderboardScope>("daily");

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex gap-3" role="group" aria-label="Sıralama türü">
        {TABS.map((tab) => (
          <Button
            key={tab.scope}
            variant={tab.scope === scope ? "ink" : "secondary"}
            aria-pressed={tab.scope === scope}
            onClick={() => setScope(tab.scope)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
      {/* key: sekme değişince liste baştan yüklenir. */}
      <LeaderboardPanel key={scope} scope={scope} />
    </div>
  );
}

function LeaderboardPanel({ scope }: { scope: LeaderboardScope }) {
  const load = useCallback(() => getSorabanClient().getLeaderboard(scope), [scope]);
  const { state, retry } = useLoad(load);

  if (state.status === "loading") {
    return <StatusState kind="loading" title="Sıralama yükleniyor…" />;
  }
  if (state.status === "error") {
    return <StatusState kind="error" title="Sıralama yüklenemedi" message={errorMessage(state.error)} onRetry={retry} />;
  }
  const data = state.data;
  // "unavailable": takma ad denetimi hazır olana kadar tablo boş gösterilir (karar).
  const entries = data.status === "ready" ? data.entries : [];
  return (
    <LeaderboardTable
      entries={entries}
      fractionDigits={1}
      caption={scope === "daily" ? "Bugünün sıralaması" : "Sezon sıralaması"}
    />
  );
}
