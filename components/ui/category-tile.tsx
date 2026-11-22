import { CATEGORIES, toneSurface, type CategoryKey, type CategoryTone } from "./categories";
import { cx } from "./cx";

export interface CategoryTileProps {
  category: CategoryKey;
  /** Overrides the default colour from CATEGORIES. */
  tone?: CategoryTone;
  className?: string;
}

/** Icon + label tile from the "Bugünün kategorileri" grid. Display only. */
export function CategoryTile({ category, tone, className }: CategoryTileProps) {
  const meta = CATEGORIES[category];
  const Icon = meta.icon;
  return (
    <div
      className={cx(
        "flex min-h-18 flex-col justify-between gap-3 rounded-md border-2 border-ink p-3 sm:min-h-26 sm:p-4",
        toneSurface[tone ?? meta.tone],
        className,
      )}
    >
      <Icon size={26} />
      <span className="text-sm font-extrabold leading-tight sm:text-base">
        <span className="sm:hidden">{meta.shortLabel}</span>
        <span className="hidden sm:inline">{meta.label}</span>
      </span>
    </div>
  );
}
