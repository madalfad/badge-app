import type { BadgeCard } from "@/features/cards/types";

type CardRenderSize = {
  width: number;
  height: number;
};

const DEFAULT_TEXT_ASPECT_RATIO = 1 / 1.45;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function estimateTextCardHeightMultiplier(card: BadgeCard) {
  const sectionRows = card.sections.reduce((totalRows, section) => {
    const valueRows = Math.max(1, Math.ceil(section.value.length / 34));
    const labelRows = Math.max(1, Math.ceil(section.label.length / 22));
    return totalRows + Math.max(valueRows, labelRows);
  }, 0);
  const titleRows = Math.max(1, Math.ceil(card.title.length / 22));
  const subtitleRows = card.subtitle
    ? Math.max(1, Math.ceil(card.subtitle.length / 36))
    : 0;
  const footerRows = card.footer
    ? Math.max(1, Math.ceil(card.footer.length / 42))
    : 0;
  const contentRows =
    sectionRows + titleRows * 0.75 + subtitleRows * 0.5 + footerRows * 0.3;

  return clamp(1 + Math.max(0, contentRows - 5.4) * 0.12, 1, 1.68);
}

export function getBadgeCardRenderSize(
  card: BadgeCard,
  maxWidth: number,
  maxHeight: number,
): CardRenderSize {
  const rawAspectRatio =
    card.hasUserImage && card.imageAspectRatio
      ? card.imageAspectRatio
      : DEFAULT_TEXT_ASPECT_RATIO / estimateTextCardHeightMultiplier(card);
  const aspectRatio = clamp(rawAspectRatio, 0.32, 3.75);
  let width = maxWidth;
  let height = width / aspectRatio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return { width, height };
}
