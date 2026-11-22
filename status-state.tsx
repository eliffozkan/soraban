import type { ReactNode } from "react";
import { Button } from "./button";
import { cx } from "./cx";
import { Logo } from "./logo";
import { Spinner } from "./spinner";

export type StatusKind = "loading" | "error" | "empty";

export interface StatusStateProps {
  kind: StatusKind;
  title: ReactNode;
  message?: ReactNode;
  /** Shows a retry button (error and empty). The caller decides what retrying does. */
  onRetry?: () => void;
  retryLabel?: string;
  /** Puts the retry button in its loading state. */
  retrying?: boolean;
  /** Extra control for the empty state, e.g. a link to the archive. */
  action?: ReactNode;
  className?: string;
}

/** Loading / error / empty block, e.g. while the guest session opens or when no questions arrive. No network calls. */
export function StatusState({
  kind,
  title,
  message,
  onRetry,
  retryLabel = "Tekrar dene",
  retrying = false,
  action,
  className,
}: StatusStateProps) {
  const retry = onRetry ? (
    <Button variant="secondary" onClick={onRetry} loading={retrying} loadingLabel="Tekrar deneniyor">
      {retryLabel}
    </Button>
  ) : null;

  if (kind === "loading") {
    return (
      <div role="status" aria-live="polite" className={cx("flex items-center gap-3 rounded-md border-2 border-ink bg-paper px-4 py-3", className)}>
        <Spinner label="" />
        <div>
          <p className="font-extrabold">{title}</p>
          {message ? <p className="text-sm font-medium text-ink-muted">{message}</p> : null}
        </div>
      </div>
    );
  }

  if (kind === "error") {
    return (
      <div role="alert" className={cx("flex flex-wrap items-center justify-between gap-3 rounded-md border-2 border-ink bg-pink px-4 py-3 shadow-hard-xs", className)}>
        <div className="min-w-0">
          <p className="font-extrabold">{title}</p>
          {message ? <p className="text-sm font-medium">{message}</p> : null}
        </div>
        {retry}
      </div>
    );
  }

  return (
    <div className={cx("flex flex-col items-center px-4 py-10 text-center", className)}>
      <Logo size={56} className="mb-5" />
      <p className="display text-2xl text-balance">{title}</p>
      {message ? <p className="mt-2 max-w-sm font-medium text-ink-muted">{message}</p> : null}
      {action || retry ? (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {action}
          {retry}
        </div>
      ) : null}
    </div>
  );
}
