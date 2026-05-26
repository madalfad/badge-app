export const VISIBLE_CARD_RADIUS = 3;

export const springConfig = {
  damping: 18,
  mass: 0.85,
  stiffness: 145,
  overshootClamping: false,
} as const;

export function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

export function getProjectedIndex(progress: number, velocityY: number, itemSpacing: number, cardCount: number) {
  'worklet';
  const projected = progress - velocityY / (itemSpacing * 7);
  return clamp(Math.round(projected), 0, Math.max(cardCount - 1, 0));
}

export function isCardInRenderWindow(index: number, activeIndex: number) {
  return Math.abs(index - activeIndex) <= VISIBLE_CARD_RADIUS;
}
