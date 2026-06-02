import { useMemo } from "react";

import type { BadgeCard } from "@/features/cards/types";

export type CardFilter =
  | { type: "all" }
  | { type: "favorites" }
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
  if (filter.type === "favorites") {
    return card.isFavorite;
  }

  if (filter.type === "category") {
    return normalize(card.category) === normalize(filter.value);
  }

  if (filter.type === "tag") {
    return (card.tags ?? []).some((tag) => normalize(tag) === normalize(filter.value));
  }

  return true;
}

function getUniqueSorted(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort(
    (left, right) => left.localeCompare(right),
  );
}

export function useFilteredCards({ cards, query, filter }: UseFilteredCardsInput) {
  const categories = useMemo(
    () => getUniqueSorted(cards.map((card) => card.category)),
    [cards],
  );

  const tags = useMemo(
    () => getUniqueSorted(cards.flatMap((card) => card.tags ?? [])),
    [cards],
  );

  const filteredCards = useMemo(
    () => cards.filter((card) => matchesFilter(card, filter) && includesQuery(card, query)),
    [cards, filter, query],
  );

  const isFiltering = query.trim().length > 0 || filter.type !== "all";

  return {
    categories,
    filteredCards,
    isFiltering,
    tags,
  };
}
