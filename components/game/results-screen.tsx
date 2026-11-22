"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CATEGORIES,
  DailySummary,
  Notice,
  RevealCard,
  scoreTier,
  ShareButton,
  StatusState,
  type DailySummaryItem,
} from "@/components/ui";
import {
  getClientMode,
  getSorabanClient,
  isSorabanClientError,
  type EpisodeLeaderboardResponse,
  type EpisodeResponse,
  type EpisodeSlug,
  type MyEpisodeResponse,
} from "@/lib/client";
import { formatDayDate } from "./format-date";
import { buildShareText, ratioCaption, type ShareMark } from "./result-text";
import { ensureSessionOnce, errorMessage } from "./session";
import { episodeHref } from "./use-episode";
import { useLoad } from "./use-load";

type ResultsData = {
  episode: EpisodeResponse;
  mine: MyEpisodeResponse;
  /** Sıralama yüklenemezse null: özet yine gösterilir. */
  board: EpisodeLeaderboardResponse | null;
};

async function loadResults(slug: EpisodeSlug): Promise<ResultsData> {
  await ensureSessionOnce();
  const client = getSorabanClient();
  const [episode, mine] = await Promise.all([client.getEpisode(slug), client.getMyEpisode(slug)]);
  let board: EpisodeLeaderboardResponse | null = null;
  if (mine.progress.completed) {
    board = await client.getEpisodeLeaderboard(slug).catch(() => null);
  }
  return { episode, mine, board };
}

/** Paylaşım: önce telefonun paylaş menüsü, yoksa panoya kopyala. Başarısızsa hata fırlatır. */
async function share(text: string) {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ text });
      return;
    } catch (error) {
      // Kullanıcı paylaşım menüsünü kapattıysa hata sayılmaz.
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }
  await navigator.clipboard.writeText(text);
}

/** Bölüm özeti: ortalama puan, soru kareleri, sıralamadaki yer, paylaşım ve cevaplar. */
export function ResultsScreen({ slug }: { slug: EpisodeSlug }) {
  const router = useRouter();
  const load = useCallback(() => loadResults(slug), [slug]);
  const { state, retry } = useLoad(load);

  if (state.status === "loading") {
    return <StatusState kind="loading" title="Sonuçların yükleniyor…" />;
  }
  if (state.status === "error") {
    if (isSorabanClientError(state.error) && state.error.code === "DAY_UNAVAILABLE") {
      return <StatusState kind="empty" title="Bu bölümün soruları henüz yayında değil" message="Biraz sonra tekrar uğra." />;
    }
    return <StatusState kind="error" title="Sonuçlar yüklenemedi" message={errorMessage(state.error)} onRetry={retry} />;
  }

  const { episode: data, mine, board } = state.data;
  const episode = data.episode;
  const questions = [...data.questions].sort((a, b) => a.position - b.position);
  const byQuestion = new Map(mine.guesses.map((g) => [g.questionId, g]));

  if (!mine.progress.completed) {
    return (
      <StatusState
        kind="empty"
        title="Bölüm henüz bitmedi"
        message={`${mine.progress.answeredCount} soru cevapladın. Özet, tüm sorular bitince açılır.`}
        action={<Button onClick={() => router.push(episodeHref("/play", slug))}>Oynamaya devam et</Button>}
      />
    );
  }

  const items: DailySummaryItem[] = questions.map((q) => ({
    position: q.position,
    scoreRaw: byQuestion.get(q.id)?.scoreRaw ?? null,
    void: q.state === "void" || undefined,
    label: q.category ? CATEGORIES[q.category].shortLabel : undefined,
  }));

  const marks: ShareMark[] = questions.map((q) => {
    if (q.state === "void") return "void";
    const score = byQuestion.get(q.id)?.scoreRaw;
    return score === undefined ? "none" : scoreTier(score);
  });

  const shareText = buildShareText({
    dayNumber: 0,
    label: episode.title,
    dailyScoreRaw: mine.progress.scoreRaw,
    marks,
  });
  const mock = getClientMode() === "mock";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <DailySummary
        // DailySummary şimdilik bir numara istiyor (Neris'e not: isteğe bağlı olsun).
        dayNumber={episode.date ? Number(episode.date.slice(8, 10)) : 0}
        title={`${episode.title} özeti`}
        date={episode.date ? formatDayDate(episode.date) : "Demo bölümü"}
        scoreRaw={mine.progress.scoreRaw}
        items={items}
        footer={<ShareButton text={shareText} onShare={share} />}
      />

      <Card tone="paper" padding="lg">
        <p className="eyebrow text-ink-muted">{episode.title} sıralaması</p>
        {board?.me ? (
          <p className="display mt-2 text-4xl">
            {board.me.rank}. sıradasın
            <span className="block text-xl font-extrabold">{board.playerCount} oyuncu tamamladı</span>
          </p>
        ) : (
          <p className="mt-2 font-bold">Sıralamadaki yerin şu an yüklenemedi.</p>
        )}
        {mock ? (
          <Notice tone="warning" className="mt-4">ÖRNEK mod: bu sıra gerçek değildir.</Notice>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => router.push(episodeHref("/leaderboard", slug))}>
            Sıralamaya bak
          </Button>
          <Button variant="ghost" onClick={() => router.push("/")}>
            Ana sayfa
          </Button>
        </div>
      </Card>

      <section className="space-y-4">
        <h2 className="display text-3xl">Cevaplar</h2>
        {questions.map((q) => {
          const result = byQuestion.get(q.id);
          if (!result) return null;
          return (
            <RevealCard
              key={q.id}
              prompt={q.prompt}
              guess={result.guess}
              correctAnswer={result.correctAnswer}
              unit={q.unit}
              scoreRaw={result.scoreRaw}
              caption={ratioCaption(result.guess, result.correctAnswer)}
              reasoning={result.reasoning}
              sourceUrl={result.sourceUrl}
            />
          );
        })}
      </section>
    </div>
  );
}
