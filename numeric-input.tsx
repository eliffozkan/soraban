"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cx } from "./cx";
import { IconLock } from "./icons";

export interface NumericShortcut {
  /** Visible text, e.g. "× bin". */
  label: string;
  value: string;
}

export interface NumericInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "size"> {
  label: string;
  /** Raw text as typed. This component never parses it. */
  value: string;
  /** Called with the raw text on every edit. */
  onChange: (value: string) => void;
  unit?: string;
  hint?: ReactNode;
  /** Optional live preview of the parsed value. The explicit pre-submit step is ConfirmPanel. */
  confirmation?: ReactNode;
  error?: ReactNode;
  locked?: boolean;
  shortcuts?: ReadonlyArray<NumericShortcut>;
  onShortcut?: (value: string) => void;
  /** Extra control at the end of the shortcut row, e.g. the calculator IconButton. */
  trailingAction?: ReactNode;
  /** white = desktop field, yellow = phone field on cream. */
  tone?: "white" | "yellow";
  size?: "md" | "lg";
}

export function NumericInput({
  label,
  value,
  onChange,
  unit,
  hint,
  confirmation,
  error,
  locked = false,
  shortcuts,
  onShortcut,
  trailingAction,
  tone = "white",
  size = "lg",
  id,
  disabled,
  className,
  ...rest
}: NumericInputProps) {
  const auto = useId();
  const inputId = id ?? `${auto}-input`;
  const hintId = `${auto}-hint`;
  const confirmId = `${auto}-confirm`;
  const errorId = `${auto}-error`;
  const invalid = Boolean(error);
  const describedBy = [hint ? hintId : null, confirmation ? confirmId : null, invalid ? errorId : null]
    .filter(Boolean)
    .join(" ");
  const showRow = (shortcuts && shortcuts.length > 0 && !locked) || trailingAction;

  return (
    <div className={cx("w-full min-w-0", className)}>
      <label htmlFor={inputId} className="eyebrow mb-2 block">
        {label}
      </label>
      <div
        className={cx(
          "flex items-center gap-3 rounded-md border-2 px-5 shadow-hard-sm",
          "focus-within:outline-3 focus-within:outline-offset-3 focus-within:outline-focus",
          invalid ? "border-pink" : "border-ink",
          locked ? "bg-paper" : tone === "yellow" ? "bg-yellow" : "bg-surface",
          disabled && "opacity-50",
        )}
      >
        {locked ? <IconLock size={22} className="shrink-0" /> : null}
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={locked}
          aria-readonly={locked || undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy || undefined}
          disabled={disabled}
          className={cx(
            "display w-0 min-w-0 flex-1 bg-transparent tabular-nums text-ink outline-none placeholder:font-semibold placeholder:text-ink-muted/70",
            size === "lg" ? "min-h-18 text-4xl sm:text-5xl" : "min-h-14 text-2xl",
          )}
          {...rest}
        />
        {unit ? <span className="shrink-0 text-lg font-extrabold">{unit}</span> : null}
      </div>

      {showRow ? (
        <div className="mt-4 flex items-center gap-3">
          {shortcuts && shortcuts.length > 0 && !locked ? (
            <div className="grid flex-1 grid-cols-3 gap-3 sm:flex sm:flex-wrap" role="group" aria-label="Büyüklük kısayolları">
              {shortcuts.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => onShortcut?.(s.value)}
                  className="min-h-11 whitespace-nowrap rounded-full border-2 border-ink bg-green px-2 text-sm font-extrabold text-ink transition-transform active:scale-95 disabled:opacity-50 sm:px-4 sm:text-base"
                >
                  {s.label}
                </button>
              ))}
            </div>
          ) : (
            <span className="flex-1" />
          )}
          {trailingAction}
        </div>
      ) : null}

      <p id={confirmId} aria-live="polite" className={cx("mt-3 font-bold", !invalid && "min-h-6")}>
        {confirmation}
      </p>
      {invalid ? (
        <p id={errorId} className="mt-1 inline-block rounded-sm border-2 border-ink bg-pink px-2 py-0.5 text-sm font-extrabold">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} className="mt-1 text-sm font-medium text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
