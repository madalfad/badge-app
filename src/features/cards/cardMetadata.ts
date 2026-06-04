export const CARD_ACCENT_PRESETS = [
  "#2DD4BF",
  "#60A5FA",
  "#A78BFA",
  "#FBBF24",
  "#F87171",
];

export function parseCardTags(tagsText: string) {
  return Array.from(
    new Set(
      tagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
}
