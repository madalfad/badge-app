import { useMemo } from "react";

import type { BadgeCard } from "@/features/cards/types";

export type CardFilter =
  | { type: "all" }
  | { type: "favorites" }
  | { type: "recent" }
  | { type: "archived" }
  | { type: "category"; value: string }
  | { type: "tag"; value: string };

type UseFilteredCardsInput = {
  cards: BadgeCard[];
  query: string;
  filter: CardFilter;
};

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase();
}

function includesQuery(card: BadgeCard, query: string) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return true;
  }

  const searchableText = [
    card.title,
    card.subtitle,
    card.category,
    card.code,
    card.footer,
    ...(card.tags ?? []),
    ...card.sections.flatMap((section) => [section.label, section.value]),
  ]
    .map(normalize)
    .join(" ");

  return searchableText.includes(normalizedQuery);
}

function matchesFilter(card: BadgeCard, filter: CardFilter) {
  if (filter.type === "archived") {
    return Boolean(card.isArchived);
  }

  if (card.isArchived) {
    return false;
  }

  if (filter.type === "favorites") {
    return card.isFavorite;
  }

  if (filter.type === "recent") {
    return Boolean(card.lastViewedAt);
  }

  if (filter.type === "category") {
    return normalize(card.category) === normalize(filter.value);
  }

  if (filter.type === "tag") {
    return (card.tags ?? []).some(
      (tag) => normalize(tag) === normalize(filter.value),
    );
  }

  return true;
}

function getUniqueSorted(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));
}

function sortFilteredCards(cards: BadgeCard[], filter: CardFilter) {
  if (filter.type !== "recent") {
    return cards;
  }

  return [...cards].sort((left, right) => {
    const leftTime = left.lastViewedAt ? Date.parse(left.lastViewedAt) : 0;
    const rightTime = right.lastViewedAt ? Date.parse(right.lastViewedAt) : 0;
    return rightTime - leftTime;
  });
}

export function useFilteredCards({
  cards,
  query,
  filter,
}: UseFilteredCardsInput) {
  const activeCards = useMemo(
    () => cards.filter((card) => !card.isArchived),
    [cards],
  );

  const archivedCards = useMemo(
    () => cards.filter((card) => card.isArchived),
    [cards],
  );

  const categories = useMemo(
    () => getUniqueSorted(activeCards.map((card) => card.category)),
    [activeCards],
  );

  const tags = useMemo(
    () => getUniqueSorted(activeCards.flatMap((card) => card.tags ?? [])),
    [activeCards],
  );

  const filteredCards = useMemo(
    () =>
      sortFilteredCards(
        cards.filter(
          (card) => matchesFilter(card, filter) && includesQuery(card, query),
        ),
        filter,
      ),
    [cards, filter, query],
  );

  const isFiltering = query.trim().length > 0 || filter.type !== "all";

  return {
    activeCards,
    archivedCards,
    categories,
    filteredCards,
    isFiltering,
    tags,
  };
}
