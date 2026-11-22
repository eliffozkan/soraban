import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "ink";
export type ButtonSize = "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = blue (KİLİTLE, OYNA), secondary = paper (Giriş yap), ghost = text only, ink = navy. */
  variant?: ButtonVariant;
  /** lg = big display button in capitals with a 6px hard shadow. */
  size?: ButtonSize;
  loading?: boolean;
  loadingLabel?: string;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-blue text-white hover:bg-blue-strong",
  secondary: "bg-paper text-ink hover:bg-surface",
  ghost: "border-transparent bg-transparent text-ink shadow-none underline-offset-4 hover:underline",
  ink: "bg-ink text-white hover:bg-ink/90",
};

const sizes: Record<ButtonSize, string> = {
  md: "min-h-12 rounded-sm px-5 text-base shadow-hard-sm active:translate-x-1 active:translate-y-1",
  lg: "display min-h-16 rounded-md px-8 text-2xl uppercase shadow-hard active:translate-x-1.5 active:translate-y-1.5 sm:text-3xl",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingLabel = "Yükleniyor",
  fullWidth = false,
  leadingIcon,
  trailingIcon,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "inline-flex items-center justify-center gap-3 border-2 border-ink font-extrabold",
        "transition-[transform,box-shadow,background-color] duration-100 active:shadow-none",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner label={loadingLabel} /> : leadingIcon}
      <span>{children}</span>
      {!loading ? trailingIcon : null}
    </button>
  );
}
