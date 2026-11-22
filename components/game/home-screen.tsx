"use client";

import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CategoryTile,
  IconArrowRight,
  StatusState,
  type CategoryKey,
} from "@/components/ui";
import { getSorabanClient, isSorabanClientError, type TodayResponse } from "@/lib/client";
import { formatDayDate } from "./format-date";
import { ensureSessionOnce, errorMessage } from "./session";
import { useLoad } from "./use-load";

async function loadToday(): Promise<TodayResponse> {
  await ensureSessionOnce();
  return getSorabanClient().getToday();
}

/** Giriş ekranı: misafir oturumu açılır, bugünün özeti ve "Oyna" düğmesi gösterilir. */
export function HomeScreen() {
  const router = useRouter();
  const { state, retry } = useLoad(loadToday);

  if (state.status === "loading") {
    return <StatusState kind="loading" title="Oyun hazırlanıyor…" message="Misafir oturumun açılıyor." />;
  }

  if (state.status === "error") {
    if (isSorabanClientError(state.error) && state.error.code === "DAY_UNAVAILABLE") {
      return (
        <StatusState
          kind="empty"
          title="Bugünün soruları henüz yayında değil"
          message="Biraz sonra tekrar uğra."
          action={<Button variant="secondary" onClick={retry}>Tekrar kontrol et</Button>}
        />
      );
    }
    return <StatusState kind="error" title="Bağlanamadık" message={errorMessage(state.error)} onRetry={retry} />;
  }

  const { day, questions, progress } = state.data;
  const playable = questions.filter((q) => q.state !== "void").length;
  const categories = Array.from(
    new Set(questions.map((q) => q.category).filter((c): c is CategoryKey => Boolean(c))),
  );
  const started = progress.answeredCount > 0;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="space-y-5">
        <Card tone="yellow" padding="lg">
          <p className="eyebrow text-ink-muted">Günün bulmacası</p>
          <p className="display mt-2 text-8xl sm:text-9xl">#{String(day.number).padStart(2, "0")}</p>
          <p className="mt-2 text-xl font-extrabold">{formatDayDate(day.date)}</p>
        </Card>
        <div className="flex flex-wrap gap-3">
          <Badge tone="ink">{questions.length} soru</Badge>
          <Badge tone="ink">Tek hak</Badge>
          <Badge>0–100 puan</Badge>
        </div>
        {progress.completed ? (
          <Button size="lg" fullWidth trailingIcon={<IconArrowRight size={30} />} onClick={() => router.push("/results")}>
            Sonuçlarını gör
          </Button>
        ) : (
          <Button size="lg" fullWidth trailingIcon={<IconArrowRight size={30} />} onClick={() => router.push("/play")}>
            {started ? `Devam et (${progress.answeredCount}/${playable})` : "Oyna"}
          </Button>
        )}
      </div>
      <div className="space-y-5">
        {categories.length > 0 ? (
          <>
            <h2 className="display text-3xl">Bugünün kategorileri</h2>
            <div className="grid grid-cols-3 gap-3">
              {categories.map((c) => (
                <CategoryTile key={c} category={c} />
              ))}
            </div>
          </>
        ) : null}
        <Card tone="paper" shadow="none" title="Nasıl oynanır?" headingLevel={2}>
          <ol className="grid gap-3">
            <li><b>Tahmin et.</b> Soruya bir sayı yaz.</li>
            <li><b>Kilitle.</b> Her soruda tek hakkın var.</li>
            <li><b>Puanı gör.</b> Ne kadar yakınsan o kadar puan.</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
