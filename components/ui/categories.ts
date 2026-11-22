import type { ComponentType } from "react";
import { IconAtom, IconBowl, IconCap, IconMuseum, IconPin, IconWaves, type IconProps } from "./icons";

export type CategoryKey =
  | "kampus"
  | "akademik"
  | "yurt-yemek"
  | "tarih-kultur"
  | "eymir-doga"
  | "bilim-topluluklar";

export type CategoryTone = "paper" | "yellow" | "pink" | "green" | "blue";

export interface CategoryMeta {
  label: string;
  /** Used where space is tight (phone tiles). */
  shortLabel: string;
  icon: ComponentType<IconProps>;
  /** Default tile colour from the v4 home mockup. Display only. */
  tone: CategoryTone;
}

/** Display metadata for the six season categories. No question content. */
export const CATEGORIES: Record<CategoryKey, CategoryMeta> = {
  kampus: { label: "Kampüs", shortLabel: "Kampüs", icon: IconPin, tone: "paper" },
  akademik: { label: "Akademik", shortLabel: "Akademik", icon: IconCap, tone: "pink" },
  "yurt-yemek": { label: "Yurt & yemek", shortLabel: "Yurt & yemek", icon: IconBowl, tone: "paper" },
  "tarih-kultur": { label: "Tarih & kültür", shortLabel: "Tarih", icon: IconMuseum, tone: "paper" },
  "eymir-doga": { label: "Eymir & doğa", shortLabel: "Eymir", icon: IconWaves, tone: "green" },
  "bilim-topluluklar": { label: "Bilim & topluluklar", shortLabel: "Bilim", icon: IconAtom, tone: "blue" },
};

export const toneSurface: Record<CategoryTone, string> = {
  paper: "bg-paper text-ink",
  yellow: "bg-yellow text-ink",
  pink: "bg-pink text-ink",
  green: "bg-green text-ink",
  blue: "bg-blue text-white",
};
