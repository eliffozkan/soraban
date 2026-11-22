"use client";

import { useRouter } from "next/navigation";
import {
  Button,
  CATEGORIES,
  DailySummary,
  RevealCard,
  scoreTier,
  ShareButton,
  StatusState,
  type DailySummaryItem,
} from "@/components/ui";
import { getSorabanClient, isSorabanClientError, type MyTodayResponse, type TodayResponse } from "@/lib/client";
import { formatDayDate } from "./format-date";
import { buildShareText, ratioCaption, type ShareMark } from "./result-text";
import { ensureSessionOnce, errorMessage } from "./session";
import { useLoad } from "./use-load";

async function loadResults(): Promise<{ today: TodayResponse; mine: MyTodayResponse }> {
  await ensureSessionOnce();
  const client = getSorabanClient();
  const [today, mine] = await Promise.all([client.getToday(), client.getMyToday()]);
  return { today, mine };
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

/** Günün özeti: günlük ortalama, soru kareleri, paylaşım ve cevaplar. */
export function ResultsScreen() {
  const router = useRouter();
  const { state, retry } = useLoad(loadResults);

  if (state.status === "loading") {
    return <StatusState kind="loading" title="Sonuçların yükleniyor…" />;
  }
  if (state.status === "error") {
    if (isSorabanClientError(state.error) && state.error.code === "DAY_UNAVAILABLE") {
      return <StatusState kind="empty" title="Bugünün soruları henüz yayında değil" message="Biraz sonra tekrar uğra." />;
    }
    return <StatusState kind="error" title="Sonuçlar yüklenemedi" message={errorMessage(state.error)} onRetry={retry} />;
  }

  const { today, mine } = state.data;
  const questions = [...today.questions].sort((a, b) => a.position - b.position);
  const byQuestion = new Map(mine.guesses.map((g) => [g.questionId, g]));

  if (!mine.progress.completed) {
    return (
      <StatusState
        kind="empty"
        title="Gün henüz bitmedi"
        message={`${mine.progress.answeredCount} soru cevapladın. Özet, tüm sorular bitince açılır.`}
        action={<Button onClick={() => router.push("/play")}>Oynamaya devam et</Button>}
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
    dayNumber: mine.day.number,
    dailyScoreRaw: mine.progress.scoreRaw,
    marks,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <DailySummary
        dayNumber={mine.day.number}
        date={formatDayDate(mine.day.date)}
        scoreRaw={mine.progress.scoreRaw}
        items={items}
        footer={<ShareButton text={shareText} onShare={share} />}
      />

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

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => router.push("/leaderboard")}>
          Sıralamaya bak
        </Button>
        <Button variant="ghost" onClick={() => router.push("/")}>
          Ana sayfa
        </Button>
      </div>
    </div>
  );
}
