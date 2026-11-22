import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Accessible name, e.g. "Kapat", "Geri", "Hesap makinesi". Required. */
  label: string;
  icon: ReactNode;
  /** square = close/back/trophy with hard shadow; circle = calculator. */
  shape?: "square" | "circle";
}

export function IconButton({ label, icon, shape = "square", className, type = "button", ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex shrink-0 items-center justify-center border-2 border-ink bg-paper text-ink transition-transform duration-100",
        "hover:bg-surface disabled:pointer-events-none disabled:opacity-50",
        shape === "square"
          ? "size-12 rounded-sm shadow-hard-sm active:translate-x-1 active:translate-y-1 active:shadow-none"
          : "size-11 rounded-full",
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  );
}
