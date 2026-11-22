import type { HTMLAttributes, ReactNode } from "react";
import { toneSurface, type CategoryTone } from "./categories";
import { cx } from "./cx";

export type CardTone = CategoryTone | "white";
export type CardPadding = "sm" | "md" | "lg";
export type CardShadow = "none" | "sm" | "md";

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  as?: "div" | "section" | "article";
  tone?: CardTone;
  padding?: CardPadding;
  shadow?: CardShadow;
  title?: ReactNode;
  description?: ReactNode;
  headingLevel?: 2 | 3 | 4;
  footer?: ReactNode;
}

const paddings: Record<CardPadding, string> = { sm: "p-4", md: "p-5 sm:p-7", lg: "p-6 sm:p-9" };
const shadows: Record<CardShadow, string> = { none: "", sm: "shadow-hard-sm", md: "shadow-hard" };

export function Card({
  as: Tag = "div",
  tone = "paper",
  padding = "md",
  shadow = "md",
  title,
  description,
  headingLevel = 2,
  footer,
  className,
  children,
  ...rest
}: CardProps) {
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  const surface = tone === "white" ? "bg-surface text-ink" : toneSurface[tone];
  return (
    <Tag className={cx("relative rounded-lg border-2 border-ink", surface, shadows[shadow], paddings[padding], className)} {...rest}>
      {title ? (
        <div className="mb-4">
          <Heading className="display text-2xl text-balance">{title}</Heading>
          {description ? <p className="mt-1 font-medium opacity-80">{description}</p> : null}
        </div>
      ) : null}
      {children}
      {footer ? <div className="mt-6 flex flex-wrap gap-3">{footer}</div> : null}
    </Tag>
  );
}
