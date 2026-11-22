import { cx } from "./cx";

export interface LogoProps {
  /** Diameter of the mark in px. */
  size?: number;
  withWordmark?: boolean;
  className?: string;
}

/** Navy disc with a yellow "≈" (about-equal) mark, as in the v4 mockups. */
export function Logo({ size = 44, withWordmark = false, className }: LogoProps) {
  return (
    <span className={cx("inline-flex items-center gap-3 text-ink", className)}>
      <svg width={size} height={size} viewBox="0 0 44 44" role="img" aria-label="SORABAN">
        <circle cx="22" cy="22" r="22" fill="#161a33" />
        <path
          d="M13 19.5c3-3 6 0 9 0s6-3 9 0M13 26c3-3 6 0 9 0s6-3 9 0"
          fill="none"
          stroke="#ffc800"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {withWordmark ? (
        <span aria-hidden="true" className="display text-[1.75rem] tracking-[0.04em]">
          SORABAN
        </span>
      ) : null}
    </span>
  );
}
