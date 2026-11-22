import type { ReactNode } from "react";
import { CATEGORIES, type CategoryKey } from "./categories";
import { cx } from "./cx";

export type BadgeTone = "ink" | "outline" | "yellow" | "pink" | "green" | "blue" | "paper";

export interface BadgeProps {
  tone?: BadgeTone;
  size?: "sm" | "md";
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

const tones: Record<BadgeTone, string> = {
  ink: "bg-ink text-yellow",
  outline: "bg-transparent text-ink",
  yellow: "bg-yellow text-ink",
  pink: "bg-pink text-ink",
  green: "bg-green text-ink",
  blue: "bg-blue text-white",
  paper: "bg-paper text-ink",
};

/** Pill label: "6 SORU", "TEK HAK", "0–100 PUAN", "GÜN 7 / 30". */
export function Badge({ tone = "outline", size = "md", icon, children, className }: BadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 whitespace-nowrap rounded-full border-2 border-ink font-extrabold uppercase",
        size === "md" ? "min-h-11 px-4 text-base" : "min-h-8 px-3 text-xs tracking-[0.1em]",
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export interface CategoryTagProps {
  category: CategoryKey;
  tone?: BadgeTone;
  className?: string;
}

/** Small category pill with icon, e.g. on the question card. */
export function CategoryTag({ category, tone = "pink", className }: CategoryTagProps) {
  const meta = CATEGORIES[category];
  const Icon = meta.icon;
  return (
    <Badge size="sm" tone={tone} icon={<Icon size={16} />} className={className}>
      {meta.label}
    </Badge>
  );
}
