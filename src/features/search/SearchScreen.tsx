import * as Haptics from "expo-haptics";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BadgeBottomNav } from "@/components/BadgeBottomNav";
import { BadgeIcon } from "@/components/BadgeIcon";
import {
  badgeColors,
  useBadgeLayout,
} from "@/components/badge-ui";
import type { BadgeCard } from "@/features/cards/types";
import { useCards } from "@/features/cards/useCards";
import { useBooleanSetting } from "@/features/settings/useBooleanSetting";

import { SearchFilterBar } from "./SearchFilterBar";
import { SearchResultsList } from "./SearchResultsList";
import { useFilteredCards, type CardFilter } from "./useFilteredCards";

function getInitialFilter(value: string | string[] | undefined): CardFilter {
  const filter = Array.isArray(value) ? value[0] : value;
  return filter === "archived" ? { type: "archived" } : { type: "all" };
}

export function SearchScreen() {
  const router = useRouter();
  const layout = useBadgeLayout();
  const params = useLocalSearchParams<{ filter?: string }>();
  const { cards, isLoading, markCardViewed, reload, toggleFavorite } =
    useCards();
  const [hapticsEnabled] = useBooleanSetting("haptics_enabled", true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CardFilter>(() =>
    getInitialFilter(params.filter),
  );

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const { categories, filteredCards, tags } = useFilteredCards({
    cards,
    filter,
    query,
  });

  const openCard = async (card: BadgeCard) => {
    await markCardViewed(card.id);
    router.push({ pathname: "/card/[id]", params: { id: card.id } });
  };

  const favoriteCard = async (card: BadgeCard) => {
    await toggleFavorite(card.id);
    if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <View
        style={[
          styles.shell,
          layout.contentMaxWidth ? { maxWidth: layout.contentMaxWidth } : null,
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <BadgeIcon name="search" color={badgeColors.primary} size={21} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Search</Text>
            <Text style={styles.subtitle}>
              {isLoading ? "Loading cards..." : `${filteredCards.length} results`}
            </Text>
          </View>
        </View>

        <SearchFilterBar
          query={query}
          filter={filter}
          categories={categories}
          tags={tags}
          resultCount={filteredCards.length}
          totalCount={cards.length}
          onQueryChange={setQuery}
          onFilterChange={setFilter}
        />

        <View style={styles.resultsWrap}>
          {filteredCards.length > 0 ? (
            <SearchResultsList
              cards={filteredCards}
              onCardLongPress={(card) =>
                router.push({
                  pathname: "/card/[id]/edit",
                  params: { id: card.id },
                })
              }
              onCardPress={openCard}
              onFavoriteToggle={favoriteCard}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No cards found</Text>
              <Text style={styles.emptyText}>
                Try another term or switch the active filter.
              </Text>
            </View>
          )}
        </View>

        <BadgeBottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: badgeColors.bg,
  },
  shell: {
    flex: 1,
    alignSelf: "center",
    width: "100%",
    paddingBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: badgeColors.border,
    backgroundColor: badgeColors.surface,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: badgeColors.text,
    fontSize: 28,
    fontWeight: "900",
  },
  subtitle: {
    color: badgeColors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  resultsWrap: {
    flex: 1,
    minHeight: 0,
  },
  emptyState: {
    margin: 22,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: badgeColors.border,
    backgroundColor: badgeColors.surface,
    padding: 18,
    gap: 7,
  },
  emptyTitle: {
    color: badgeColors.text,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyText: {
    color: badgeColors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    textAlign: "center",
  },
});
