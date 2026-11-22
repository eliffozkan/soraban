import { cx } from "./cx";

export interface SpinnerProps {
  /** Screen-reader text. Pass "" when a parent already announces the state. */
  label?: string;
  className?: string;
}

export function Spinner({ label = "Yükleniyor", className }: SpinnerProps) {
  return (
    <span className={cx("inline-flex items-center", className)}>
      <span aria-hidden="true" className="size-5 animate-spin rounded-full border-[3px] border-current border-r-transparent" />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
