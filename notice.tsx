import type { ReactNode } from "react";
import { cx } from "./cx";

export type NoticeTone = "info" | "success" | "warning" | "danger";

export interface NoticeProps {
  tone?: NoticeTone;
  title?: ReactNode;
  children?: ReactNode;
  /** Announce with role="status". Danger always uses role="alert". */
  live?: boolean;
  className?: string;
}

const tones: Record<NoticeTone, string> = {
  info: "bg-paper",
  success: "bg-green",
  warning: "bg-yellow",
  danger: "bg-pink",
};

export function Notice({ tone = "info", title, children, live = false, className }: NoticeProps) {
  const role = tone === "danger" ? "alert" : live ? "status" : undefined;
  return (
    <div role={role} className={cx("rounded-md border-2 border-ink px-4 py-3 text-ink shadow-hard-xs", tones[tone], className)}>
      {title ? <p className="font-extrabold">{title}</p> : null}
      {children ? <div className={cx("text-sm font-medium", title ? "mt-0.5" : null)}>{children}</div> : null}
    </div>
  );
}
