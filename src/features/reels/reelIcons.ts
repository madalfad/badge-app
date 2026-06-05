import type { BadgeIconName } from "@/components/BadgeIcon";

export type ReelIconOption = {
  icon: BadgeIconName;
  label: string;
  value: string;
};

export const REEL_ICON_OPTIONS: ReelIconOption[] = [
  { value: "badge", label: "Badge", icon: "badge" },
  { value: "heart-pulse", label: "ICU", icon: "heart-pulse" },
  { value: "archive", label: "Archive", icon: "archive" },
  { value: "star", label: "Favorites", icon: "star" },
  { value: "link", label: "Reference", icon: "link" },
  { value: "stethoscope", label: "Clinical", icon: "stethoscope" },
  { value: "file-text", label: "Notes", icon: "file-text" },
  { value: "layers", label: "Stack", icon: "layers" },
];

export function getReelIconName(value: string | null | undefined) {
  return (
    REEL_ICON_OPTIONS.find((option) => option.value === value)?.icon ?? "badge"
  );
}
