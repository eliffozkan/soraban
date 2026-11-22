import type { ReactNode } from "react";
import { Button } from "./button";
import { cx } from "./cx";
import { IconLock } from "./icons";

export interface ConfirmPanelProps {
  /** Parsed value as the caller formatted it, e.g. "1.500". */
  formattedValue: string;
  /** Words for the value, e.g. "bin beş yüz". */
  spokenValue?: string;
  unit: string;
  onConfirm: () => void;
  onEdit: () => void;
  /** Submission in progress: confirm shows a spinner, edit is disabled. */
  loading?: boolean;
  title?: ReactNode;
  confirmLabel?: string;
  editLabel?: string;
  className?: string;
}

/** "Şunu mu demek istedin?" step before a guess is locked. */
export function ConfirmPanel({
  formattedValue,
  spokenValue,
  unit,
  onConfirm,
  onEdit,
  loading = false,
  title = "Şunu mu demek istedin?",
  confirmLabel = "Evet, kilitle",
  editLabel = "Düzelt",
  className,
}: ConfirmPanelProps) {
  return (
    <section
      aria-label="Tahmin onayı"
      className={cx("rounded-lg border-2 border-ink bg-paper p-5 shadow-hard sm:p-7", className)}
    >
      <p className="eyebrow text-ink-muted">{title}</p>
      <p className="display mt-3 flex flex-wrap items-baseline gap-x-3 text-5xl tabular-nums sm:text-6xl">
        {formattedValue}
        <span className="text-2xl font-extrabold">{unit}</span>
      </p>
      {spokenValue ? <p className="mt-2 text-lg font-bold text-ink-muted">{spokenValue}</p> : null}
      <p className="mt-4 font-medium">Kilitledikten sonra değiştiremezsin.</p>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
        <Button variant="secondary" onClick={onEdit} disabled={loading} className="sm:flex-1">
          {editLabel}
        </Button>
        <Button onClick={onConfirm} loading={loading} loadingLabel="Kilitleniyor" leadingIcon={<IconLock size={20} />} className="sm:flex-[2]">
          {confirmLabel}
        </Button>
      </div>
    </section>
  );
}
