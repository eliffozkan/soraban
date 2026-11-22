import { cx } from "./cx";

export interface TimerDisplayProps {
  /** e.g. "Yeni sorulara" */
  label: string;
  /** Pre-formatted by the caller, e.g. "09:28:14". */
  value: string;
  layout?: "stacked" | "inline";
  className?: string;
}

/** Static countdown readout. The caller owns the clock and re-renders the value. */
export function TimerDisplay({ label, value, layout = "stacked", className }: TimerDisplayProps) {
  return (
    <p className={cx(layout === "stacked" ? "flex flex-col" : "flex items-baseline gap-3", className)}>
      <span className="font-bold text-ink-muted">{label}</span>
      <span className="display text-3xl tabular-nums">
        <time>{value}</time>
      </span>
    </p>
  );
}
