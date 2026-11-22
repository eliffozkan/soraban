"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, IconArrowRight, Notice, StatusState } from "@/components/ui";
import {
  EPISODES,
  getClientMode,
  getSorabanClient,
  isSorabanClientError,
  type Episode,
  type EpisodeResponse,
  type EpisodeSlug,
} from "@/lib/client";
import { readNicknameSkipped, storeEpisode, storeNicknameSkipped, subscribeStorage } from "./episode-storage";
import { formatDayDate } from "./format-date";
import { NicknameForm } from "./nickname-form";
import { ensureSessionOnce, errorMessage } from "./session";
import { episodeHref } from "./use-episode";
import { useLoad } from "./use-load";

type EpisodeCardData = { episode: Episode } & (
  | { status: "ready"; data: EpisodeResponse }
  | { status: "error"; error: unknown }
);

type HomeData = { nickname: string | null; episodes: EpisodeCardData[] };

async function loadHome(): Promise<HomeData> {
  await ensureSessionOnce();
  const client = getSorabanClient();
  // Bir bölüm yüklenemese bile diğeri oynanabilsin diye ayrı ayrı beklenir.
  const [nick, ...results] = await Promise.all([
    client.getNickname(),
    ...EPISODES.map((episode) =>
      client.getEpisode(episode.slug).then(
        (data): EpisodeCardData => ({ episode, status: "ready", data }),
        (error: unknown): EpisodeCardData => ({ episode, status: "error", error }),
      ),
    ),
  ]);
  return { nickname: nick.nickname, episodes: results };
}

/** Ana sayfa: takma ad + iki bağımsız bölüm (Demo, 22 Kasım). */
export function HomeScreen() {
  const { state, retry, setState } = useLoad(loadHome);

  if (state.status === "loading") {
    return <StatusState kind="loading" title="Oyun hazırlanıyor…" message="Misafir oturumun açılıyor." />;
  }
  if (state.status === "error") {
    return <StatusState kind="error" title="Bağlanamadık" message={errorMessage(state.error)} onRetry={retry} />;
  }
  return (
    <HomeReady
      data={state.data}
      onNickname={(nickname) => setState({ status: "ready", data: { ...state.data, nickname } })}
    />
  );
}

function HomeReady({ data, onNickname }: { data: HomeData; onNickname: (nickname: string) => void }) {
  const router = useRouter();
  const skipped = useSyncExternalStore(subscribeStorage, readNicknameSkipped, () => false);
  // Takma ad sorulacak bölüm (oyuna girmeden önce) ya da "değiştir" modu.
  const [asking, setAsking] = useState<{ slug: EpisodeSlug | null } | null>(null);

  const go = useCallback(
    (slug: EpisodeSlug, completed: boolean) => {
      storeEpisode(slug);
      router.push(episodeHref(completed ? "/results" : "/play", slug));
    },
    [router],
  );

  function choose(slug: EpisodeSlug, completed: boolean) {
    if (!completed && data.nickname === null && !skipped) {
      setAsking({ slug });
      return;
    }
    go(slug, completed);
  }

  if (asking) {
    const continueTo = asking.slug;
    return (
      <div className="mx-auto max-w-2xl">
        <NicknameForm
          initial={data.nickname}
          onDone={(nickname) => {
            onNickname(nickname);
            storeNicknameSkipped(false);
            setAsking(null);
            if (continueTo) go(continueTo, false);
          }}
          onSkip={
            continueTo
              ? () => {
                  storeNicknameSkipped(true);
                  setAsking(null);
                  go(continueTo, false);
                }
              : undefined
          }
          onCancel={() => setAsking(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-lg font-bold">
          {data.nickname ? (
            <>
              Takma adın: <span className="font-extrabold">{data.nickname}</span>
            </>
          ) : (
            "Takma ad seçmedin"
          )}
        </p>
        <Button variant="secondary" onClick={() => setAsking({ slug: null })}>
          {data.nickname ? "Takma adı değiştir" : "Takma ad seç"}
        </Button>
      </div>

      {getClientMode() === "mock" ? (
        <Notice tone="warning" title="Örnek mod">
          Sorular ve puanlar ÖRNEK veridir; gerçek bir sıralama değildir.
        </Notice>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {data.episodes.map((card) => (
          <EpisodeCard key={card.episode.slug} card={card} onChoose={choose} />
        ))}
      </div>

      <Card tone="paper" shadow="none" title="Nasıl oynanır?" headingLevel={2}>
        <ol className="grid gap-3">
          <li><b>Bölüm seç.</b> Demo ve 22 Kasım ayrı oyunlardır; puanları karışmaz.</li>
          <li><b>Tahmin et ve kilitle.</b> Her soruda tek hakkın var.</li>
          <li><b>Puanı gör.</b> Ne kadar yakınsan o kadar puan; sonunda sıralamadaki yerini gör.</li>
        </ol>
      </Card>
    </div>
  );
}

function EpisodeCard({
  card,
  onChoose,
}: {
  card: EpisodeCardData;
  onChoose: (slug: EpisodeSlug, completed: boolean) => void;
}) {
  const router = useRouter();
  const { episode } = card;
  const heading = (
    <>
      <p className="eyebrow text-ink-muted">{episode.kind === "demo" ? "Sunum bölümü" : "ODTÜ bölümü"}</p>
      <h2 className="display mt-2 text-6xl sm:text-7xl">{episode.title}</h2>
      {episode.date ? <p className="mt-2 text-xl font-extrabold">{formatDayDate(episode.date)}</p> : null}
    </>
  );

  if (card.status === "error") {
    const unpublished = isSorabanClientError(card.error) && card.error.code === "DAY_UNAVAILABLE";
    return (
      <Card tone="paper" padding="lg">
        {heading}
        <p className="mt-4 font-bold">
          {unpublished ? "Bu bölümün soruları henüz yayında değil." : errorMessage(card.error)}
        </p>
      </Card>
    );
  }

  const { questions, progress } = card.data;
  const playable = questions.filter((q) => q.state !== "void").length;
  const started = progress.answeredCount > 0;

  return (
    <Card tone={episode.kind === "demo" ? "yellow" : "green"} padding="lg">
      {heading}
      <div className="mt-4 flex flex-wrap gap-3">
        <Badge tone="ink">{questions.length} soru</Badge>
        <Badge tone="ink">Tek hak</Badge>
        {progress.completed ? <Badge>Tamamlandı</Badge> : started ? <Badge>{progress.answeredCount}/{playable}</Badge> : null}
      </div>
      <div className="mt-6 flex flex-col gap-3">
        <Button
          size="lg"
          fullWidth
          trailingIcon={<IconArrowRight size={30} />}
          onClick={() => onChoose(episode.slug, progress.completed)}
        >
          {progress.completed ? "Sonuçlarını gör" : started ? `Devam et (${progress.answeredCount}/${playable})` : "Oyna"}
        </Button>
        <Button variant="secondary" fullWidth onClick={() => router.push(episodeHref("/leaderboard", episode.slug))}>
          {episode.title} sıralaması
        </Button>
      </div>
    </Card>
  );
}
