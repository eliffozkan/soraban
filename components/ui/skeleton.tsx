import { cx } from "./cx";

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({ width = "100%", height = "1rem", className }: SkeletonProps) {
  return <span aria-hidden="true" className={cx("block animate-pulse rounded-sm bg-ink/10", className)} style={{ width, height }} />;
}
