import type { ReactNode } from "react";
import { cx } from "./cx";

export type ScoreTier = "high" | "good" | "fair" | "low";

/** Colour band for a score: >= 90 high, >= 75 good, >= 50 fair, else low. Visual only, not a game rule. */
export function scoreTier(score: number): ScoreTier {
  if (score >= 90) return "high";
  if (score >= 75) return "good";
  if (score >= 50) return "fair";
  return "low";
}

const tierSurface: Record<ScoreTier, string> = {
  high: "bg-green text-ink",
  good: "bg-blue text-white",
  fair: "bg-yellow text-ink",
  low: "bg-pink text-ink",
};

export interface ScoreDisplayProps {
  /** Raw, unrounded score from the API. Rounded here for display only. null = not available. */
  scoreRaw: number | null;
  /** 0 for a single question (85), 1 for the daily mean (84,9). */
  fractionDigits?: 0 | 1;
  label?: string;
  caption?: ReactNode;
  size?: "sm" | "md" | "lg";
  max?: number;
  loading?: boolean;
  className?: string;
}

const figure = { sm: "text-4xl", md: "text-6xl", lg: "text-7xl sm:text-8xl" };

export function ScoreDisplay({
  scoreRaw,
  fractionDigits = 0,
  label = "Puan",
  caption,
  size = "md",
  max = 100,
  loading = false,
  className,
}: ScoreDisplayProps) {
  const has = typeof scoreRaw === "number" && Number.isFinite(scoreRaw);
  const tier = has ? scoreTier(scoreRaw) : null;
  const text = has
    ? new Intl.NumberFormat("tr-TR", { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(scoreRaw)
    : "—";

  return (
    <div
      aria-busy={loading || undefined}
      className={cx(
        "min-w-0 rounded-md border-2 border-ink p-4 shadow-hard-sm",
        tier ? tierSurface[tier] : "bg-paper text-ink",
        className,
      )}
    >
      <p className="eyebrow opacity-85">{label}</p>
      {loading ? (
        <span aria-hidden="true" className={cx("mt-2 block h-[1em] w-28 animate-pulse rounded-sm bg-ink/15", figure[size])} />
      ) : (
        <p className={cx("display mt-1 flex items-baseline gap-1 tabular-nums", figure[size])}>
          <span key={text} className={cx(has && "inline-block animate-score-pop", !has && "opacity-50")}>
            {text}
          </span>
          {has ? <span className="text-lg font-extrabold opacity-80">/{max}</span> : <span className="sr-only">Puan henüz yok</span>}
        </p>
      )}
      {caption ? <p className="mt-2 font-bold">{caption}</p> : null}
    </div>
  );
}
