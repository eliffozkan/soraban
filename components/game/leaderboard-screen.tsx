"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, LeaderboardTable, Notice, StatusState } from "@/components/ui";
import { EPISODES, getClientMode, getSorabanClient, type EpisodeSlug } from "@/lib/client";
import { storeEpisode } from "./episode-storage";
import { ensureSessionOnce, errorMessage } from "./session";
import { episodeHref } from "./use-episode";
import { useLoad } from "./use-load";

/** Bölüm sıralaması: her bölümün ayrı tablosu. Puanlar bölümler arasında karışmaz. */
export function LeaderboardScreen({ slug }: { slug: EpisodeSlug }) {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap gap-3" role="group" aria-label="Bölüm">
        {EPISODES.map((episode) => (
          <Button
            key={episode.slug}
            variant={episode.slug === slug ? "ink" : "secondary"}
            aria-pressed={episode.slug === slug}
            onClick={() => {
              storeEpisode(episode.slug);
              router.replace(episodeHref("/leaderboard", episode.slug));
            }}
          >
            {episode.title}
          </Button>
        ))}
      </div>
      {getClientMode() === "mock" ? (
        <Notice tone="warning" title="Örnek mod">
          Bu tablo gerçek bir sıralama değildir; yalnızca bu tarayıcıdaki ÖRNEK sonucu gösterir.
        </Notice>
      ) : null}
      {/* key: bölüm değişince liste baştan yüklenir. */}
      <LeaderboardPanel key={slug} slug={slug} />
    </div>
  );
}

function LeaderboardPanel({ slug }: { slug: EpisodeSlug }) {
  const load = useCallback(async () => {
    await ensureSessionOnce();
    return getSorabanClient().getEpisodeLeaderboard(slug);
  }, [slug]);
  const { state, retry } = useLoad(load);

  if (state.status === "loading") {
    return <StatusState kind="loading" title="Sıralama yükleniyor…" />;
  }
  if (state.status === "error") {
    return <StatusState kind="error" title="Sıralama yüklenemedi" message={errorMessage(state.error)} onRetry={retry} />;
  }
  const { episode, entries, me, playerCount } = state.data;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-bold">
          {playerCount} oyuncu tamamladı{me ? ` · Sen ${me.rank}. sıradasın` : ""}
        </p>
        <Button variant="secondary" onClick={retry}>
          Yenile
        </Button>
      </div>
      <LeaderboardTable
        entries={entries}
        highlightRank={me?.rank}
        fractionDigits={1}
        caption={`${episode.title} sıralaması`}
        emptyTitle="Henüz kimse bitirmedi"
        emptyMessage="Bölümü bitiren ilk oyuncular burada görünecek."
      />
    </div>
  );
}
