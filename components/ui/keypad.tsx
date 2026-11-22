import { cx } from "./cx";
import { IconBackspace } from "./icons";

export type KeypadKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "," | "backspace";

export interface KeypadProps {
  /** Reports the pressed key; the caller edits the value. */
  onKey: (key: KeypadKey) => void;
  disabled?: boolean;
  className?: string;
}

const keys: KeypadKey[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "backspace"];

/** On-screen number pad for phones. Pair with NumericInput inputMode="none" if the system keyboard should stay closed. */
export function Keypad({ onKey, disabled, className }: KeypadProps) {
  return (
    <div className={cx("grid grid-cols-3 gap-2.5", className)} role="group" aria-label="Sayı tuşları">
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          disabled={disabled}
          onClick={() => onKey(k)}
          aria-label={k === "backspace" ? "Sil" : k === "," ? "Virgül" : undefined}
          className="display flex min-h-14 items-center justify-center rounded-md border-2 border-ink bg-paper text-2xl text-ink transition-transform active:scale-95 active:bg-yellow disabled:opacity-50"
        >
          {k === "backspace" ? <IconBackspace size={26} /> : k}
        </button>
      ))}
    </div>
  );
}
