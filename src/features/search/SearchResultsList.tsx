import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { BadgeCard } from "@/features/cards/types";

type SearchResultsListProps = {
  cards: BadgeCard[];
  onCardPress: (card: BadgeCard) => void;
  onCardLongPress: (card: BadgeCard) => void;
  onFavoriteToggle: (card: BadgeCard) => void;
};

export function SearchResultsList({
  cards,
  onCardPress,
  onCardLongPress,
  onFavoriteToggle,
}: SearchResultsListProps) {
  return (
    <ScrollView
      accessibilityLabel="Filtered badge card results"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {cards.map((card) => (
        <SearchResultItem
          key={card.id}
          card={card}
          onFavoriteToggle={() => onFavoriteToggle(card)}
          onLongPress={() => onCardLongPress(card)}
          onPress={() => onCardPress(card)}
        />
      ))}
    </ScrollView>
  );
}

type SearchResultItemProps = {
  card: BadgeCard;
  onPress: () => void;
  onLongPress: () => void;
  onFavoriteToggle: () => void;
};

function formatViewedAt(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const viewedAt = new Date(value);
  if (Number.isNaN(viewedAt.getTime())) {
    return null;
  }

  return viewedAt.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function SearchResultItem({
  card,
  onPress,
  onLongPress,
  onFavoriteToggle,
}: SearchResultItemProps) {
  const imageUri =
    card.frontThumbnailUri ?? card.frontDisplayUri ?? card.frontFileUri ?? null;
  const viewedLabel = formatViewedAt(card.lastViewedAt);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${card.title}, ${card.category} search result`}
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      <View
        style={[styles.thumbnail, { borderColor: `${card.accentColor}99` }]}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            contentFit="cover"
            recyclingKey={`${card.id}-search`}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <Text style={[styles.codeText, { color: card.accentColor }]}>
            {card.code}
          </Text>
        )}
      </View>

      <View style={styles.copy}>
        <View style={styles.topRow}>
          <Text numberOfLines={1} style={styles.title}>
            {card.title}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              card.isFavorite ? "Remove favorite" : "Add favorite"
            }
            onPress={(event) => {
              event.stopPropagation();
              onFavoriteToggle();
            }}
            style={styles.favoriteButton}
          >
            <Text
              style={[
                styles.favoriteText,
                card.isFavorite && { color: card.accentColor },
              ]}
            >
              ★
            </Text>
          </Pressable>
        </View>
        <Text numberOfLines={1} style={styles.subtitle}>
          {card.subtitle || "Imported reference image"}
        </Text>
        <View style={styles.metaRow}>
          {card.isArchived ? (
            <Text style={styles.archivePill}>Archived</Text>
          ) : null}
          {viewedLabel ? (
            <Text style={styles.pill}>Viewed {viewedLabel}</Text>
          ) : null}
          <Text style={[styles.pill, { color: card.accentColor }]}>
            {card.category}
          </Text>
          {(card.tags ?? []).slice(0, 3).map((tag) => (
            <Text key={tag} style={styles.pill}>
              #{tag}
            </Text>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 10,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 30,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#26364F",
    backgroundColor: "#101C2EE6",
    padding: 12,
  },
  thumbnail: {
    width: 70,
    height: 90,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    backgroundColor: "#07111F",
  },
  codeText: {
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  copy: {
    flex: 1,
    gap: 5,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    flex: 1,
    color: "#F8FAFC",
    fontSize: 17,
    fontWeight: "900",
  },
  favoriteButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#17243A",
  },
  favoriteText: {
    color: "#F8FAFC66",
    fontSize: 18,
    fontWeight: "900",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 4,
  },
  pill: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#17243A",
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  archivePill: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#FBBF241F",
    color: "#FDE68A",
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  pressed: {
    opacity: 0.78,
  },
});
