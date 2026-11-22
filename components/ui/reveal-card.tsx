import type { ReactNode } from "react";
import { cx } from "./cx";
import { formatNumber, safeExternalUrl } from "./format";
import { ScoreDisplay } from "./score-display";

export interface RevealCardProps {
  guess: number;
  correctAnswer: number;
  unit: string;
  /** Raw score from the server; rounded only for display. */
  scoreRaw: number;
  reasoning?: ReactNode;
  /** Shown as a "Kaynak" link only if it is an absolute http(s) URL. */
  sourceUrl?: string;
  sourceLabel?: string;
  /** Optional line under the score, e.g. "1,5 kat az" (computed by the caller). */
  caption?: ReactNode;
  /** Optional question text above the result. */
  prompt?: ReactNode;
  className?: string;
}

/** Result after a guess is committed: guess vs answer, score, reasoning and source. */
export function RevealCard({
  guess,
  correctAnswer,
  unit,
  scoreRaw,
  reasoning,
  sourceUrl,
  sourceLabel = "Kaynak",
  caption,
  prompt,
  className,
}: RevealCardProps) {
  const href = safeExternalUrl(sourceUrl);
  return (
    <article className={cx("rounded-lg border-2 border-ink bg-paper p-5 shadow-hard sm:p-7", className)}>
      {prompt ? <h2 className="display mb-5 text-2xl text-balance sm:text-3xl">{prompt}</h2> : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-md border-2 border-ink bg-surface p-4">
          <p className="eyebrow text-ink-muted">Senin tahminin</p>
          <p className="display mt-1 text-3xl tabular-nums break-words">{formatNumber(guess)}</p>
          <p className="font-bold">{unit}</p>
        </div>
        <div className="rounded-md border-2 border-ink bg-yellow p-4">
          <p className="eyebrow">Doğru cevap</p>
          <p className="display mt-1 text-3xl tabular-nums break-words">{formatNumber(correctAnswer)}</p>
          <p className="font-bold">{unit}</p>
        </div>
        <ScoreDisplay scoreRaw={scoreRaw} caption={caption} size="sm" className="shadow-none" />
      </div>
      {reasoning ? <div className="mt-5 border-l-4 border-green pl-4 font-medium">{reasoning}</div> : null}
      {href ? (
        <p className="mt-4">
          <a href={href} target="_blank" rel="noopener noreferrer" className="font-extrabold underline decoration-2 underline-offset-4">
            {sourceLabel}
            <span className="sr-only"> (yeni sekmede açılır)</span>
          </a>
        </p>
      ) : null}
    </article>
  );
}
