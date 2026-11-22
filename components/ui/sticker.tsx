import type { ReactNode } from "react";
import { cx } from "./cx";

export interface StickerProps {
  children: ReactNode;
  tone?: "blue" | "pink" | "yellow" | "green";
  /** Rotation in degrees. Default 6. */
  tilt?: number;
  /** circle = round badge like the "%" mark. */
  shape?: "tag" | "circle";
  className?: string;
}

const tones = {
  blue: "bg-blue text-white",
  pink: "bg-pink text-ink",
  yellow: "bg-yellow text-ink",
  green: "bg-green text-ink",
};

/** Tilted decorative label ("TEK HAK!", "×10"). Position it with className (e.g. absolute). */
export function Sticker({ children, tone = "blue", tilt = 6, shape = "tag", className }: StickerProps) {
  return (
    <span
      className={cx(
        "display inline-flex items-center justify-center border-2 border-ink uppercase shadow-hard-xs",
        shape === "tag" ? "rounded-sm px-4 py-1.5 text-xl" : "size-20 rounded-full text-3xl",
        tones[tone],
        className,
      )}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {children}
    </span>
  );
}
