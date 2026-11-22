import type { ReactNode } from "react";
import { cx } from "./cx";
import { ScoreDisplay, scoreTier, type ScoreTier } from "./score-display";

export interface DailySummaryItem {
  /** 1-based question position. */
  position: number;
  /** Raw score; null when not answered. */
  scoreRaw: number | null;
  void?: boolean;
  /** Short category label, e.g. "Kampüs". */
  label?: string;
}

export interface DailySummaryProps {
  dayNumber: number;
  /** Raw daily mean; shown with one decimal. null while incomplete. */
  scoreRaw: number | null;
  items: readonly DailySummaryItem[];
  /** e.g. "22 Kasım 2026 · Pazar" (formatted by the caller). */
  date?: ReactNode;
  title?: ReactNode;
  /** Slot under the grid, e.g. a ShareButton. */
  footer?: ReactNode;
  className?: string;
}

const tile: Record<ScoreTier, string> = {
  high: "bg-green text-ink",
  good: "bg-blue text-white",
  fair: "bg-yellow text-ink",
  low: "bg-pink text-ink",
};

/** End-of-day summary: day number, daily score and one tile per question. */
export function DailySummary({ dayNumber, scoreRaw, items, date, title = "Günün özeti", footer, className }: DailySummaryProps) {
  return (
    <section aria-label={typeof title === "string" ? title : "Günün özeti"} className={cx("rounded-lg border-2 border-ink bg-yellow p-5 shadow-hard sm:p-8", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-ink-muted">{title}</p>
          <p className="display mt-1 text-7xl">#{String(dayNumber).padStart(2, "0")}</p>
          {date ? <p className="mt-1 text-lg font-extrabold">{date}</p> : null}
        </div>
        <ScoreDisplay scoreRaw={scoreRaw} fractionDigits={1} label="Günün puanı" size="md" className="min-w-44" />
      </div>
      <ol className="mt-6 grid grid-cols-3 gap-2.5 sm:grid-cols-6">
        {items.map((item) => {
          const answered = !item.void && typeof item.scoreRaw === "number";
          const text = item.void ? "İptal" : answered ? String(Math.round(item.scoreRaw as number)) : "—";
          const spoken = item.void ? "iptal edildi" : answered ? `${text} puan` : "cevaplanmadı";
          return (
            <li
              key={item.position}
              className={cx(
                "flex min-h-20 flex-col justify-between rounded-md border-2 border-ink p-2.5",
                answered ? tile[scoreTier(item.scoreRaw as number)] : "bg-paper text-ink-muted",
                item.void && "bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgb(22_26_51/0.12)_6px_8px)]",
              )}
            >
              <span className="text-xs font-extrabold">
                S{item.position}
                {item.label ? <span className="hidden sm:inline"> · {item.label}</span> : null}
              </span>
              <span className={cx("display tabular-nums", item.void ? "text-lg" : "text-2xl")} aria-hidden="true">{text}</span>
              <span className="sr-only">{`Soru ${item.position}: ${spoken}`}</span>
            </li>
          );
        })}
      </ol>
      {footer ? <div className="mt-6">{footer}</div> : null}
    </section>
  );
}
