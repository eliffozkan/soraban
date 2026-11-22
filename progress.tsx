import { cx } from "./cx";
import { IconCheck } from "./icons";

export type ProgressState = "unanswered" | "answered" | "void";

export interface ProgressProps {
  /** One entry per question position, in order. */
  states: readonly ProgressState[];
  /** 1-based position of the question on screen (same as QuestionPublic.position). Omit on summary screens. */
  current?: number;
  /** Number of positions. Defaults to states.length; missing states count as unanswered. */
  total?: number;
  /** bar = pill segments + "Soru 2/6" (header); chips = numbered chips (under the card). */
  variant?: "bar" | "chips";
  /** Short category labels per position for the chips variant, e.g. "Kampüs". */
  labels?: readonly (string | undefined)[];
  /** Accessible name of the nav. */
  label?: string;
  showCount?: boolean;
  /** When set, positions render as buttons; receives the 1-based position. */
  onSelect?: (position: number) => void;
  className?: string;
}

type Look = ProgressState | "current";

const spoken: Record<Look, string> = {
  unanswered: "cevaplanmadı",
  current: "şu anki soru",
  answered: "cevaplandı",
  void: "iptal edildi",
};

const segment: Record<Look, string> = {
  answered: "bg-ink",
  current: "bg-blue",
  unanswered: "bg-transparent",
  void: "bg-[repeating-linear-gradient(135deg,var(--color-ink)_0_2px,transparent_2px_6px)]",
};

const chip: Record<Look, string> = {
  answered: "bg-ink text-yellow",
  current: "bg-blue text-white shadow-hard-xs",
  unanswered: "bg-transparent text-ink",
  void: "bg-transparent text-ink-muted line-through",
};

export function Progress({
  states,
  current,
  total = states.length,
  variant = "bar",
  labels,
  label = "Soru ilerlemesi",
  showCount = true,
  onSelect,
  className,
}: ProgressProps) {
  const positions = Array.from({ length: total }, (_, i) => states[i] ?? "unanswered");
  const done = positions.filter((s) => s !== "unanswered").length;
  const shown = current ?? Math.min(done, total);

  return (
    <nav aria-label={label} className={cx("flex items-center gap-3", className)}>
      <ol className={cx("flex items-center", variant === "bar" ? "gap-1.5" : "flex-wrap gap-2")}>
        {positions.map((state, i) => {
          const position = i + 1;
          const isCurrent = position === current && state !== "void";
          const look: Look = isCurrent ? "current" : state;
          const tag = labels?.[i];
          const sr = `Soru ${position}${tag ? ` (${tag})` : ""}: ${spoken[look]}${isCurrent && state === "answered" ? ", cevaplandı" : ""}`;
          const cls =
            variant === "bar"
              ? cx("block h-3.5 w-7 rounded-full border-2 border-ink sm:w-10", segment[look])
              : cx("inline-flex min-h-9 items-center gap-1 rounded-sm border-2 border-ink px-3 text-sm font-extrabold", chip[look]);
          const content =
            variant === "bar" ? null : (
              <>
                <span aria-hidden="true">
                  {position}
                  {tag && look !== "unanswered" ? ` · ${tag}` : ""}
                </span>
                {state === "answered" ? <IconCheck size={14} /> : null}
              </>
            );
          return (
            <li key={position} aria-current={isCurrent ? "step" : undefined}>
              {onSelect ? (
                <button type="button" onClick={() => onSelect(position)} className={cx(cls, "hover:opacity-85")}>
                  {content}
                  <span className="sr-only">{sr}</span>
                </button>
              ) : (
                <span className={cls}>
                  {content}
                  <span className="sr-only">{sr}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {showCount && variant === "bar" ? (
        <span className="shrink-0 whitespace-nowrap text-lg font-extrabold tabular-nums" aria-hidden="true">
          <span className="hidden sm:inline">Soru </span>
          {shown}/{total}
        </span>
      ) : null}
    </nav>
  );
}
