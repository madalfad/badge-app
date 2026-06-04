import { Image } from "expo-image";
import { memo, useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { BadgeCard } from "@/features/cards/types";

type BadgeReelCardProps = {
  card: BadgeCard;
  width: number;
  height: number;
  focused: boolean;
  onPress: () => void;
  onDoublePress: () => void;
  onLongPress: () => void;
};

function BadgeReelCardComponent({
  card,
  width,
  height,
  focused,
  onPress,
  onDoublePress,
  onLongPress,
}: BadgeReelCardProps) {
  const lastTapAt = useRef(0);
  const singleTapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (singleTapTimeout.current) {
        clearTimeout(singleTapTimeout.current);
      }
    };
  }, []);

  const handlePress = () => {
    const now = Date.now();
    const isDoubleTap = now - lastTapAt.current < 280;

    if (isDoubleTap) {
      if (singleTapTimeout.current) {
        clearTimeout(singleTapTimeout.current);
        singleTapTimeout.current = null;
      }
      lastTapAt.current = 0;
      onDoublePress();
      return;
    }

    lastTapAt.current = now;
    singleTapTimeout.current = setTimeout(() => {
      singleTapTimeout.current = null;
      onPress();
    }, 210);
  };

  const imageUri =
    card.frontThumbnailUri ?? card.frontDisplayUri ?? card.frontFileUri;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${card.title}, ${card.category} reference card`}
      onLongPress={onLongPress}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.pressable,
        {
          width,
          height,
          opacity: pressed ? 0.94 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      {imageUri ? (
        <View
          style={[styles.card, styles.imageCard, focused && styles.focusedCard]}
        >
          <Image
            source={{ uri: imageUri }}
            contentFit="cover"
            recyclingKey={card.id}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.imageScrim} />
          <View
            style={[styles.accentRail, { backgroundColor: card.accentColor }]}
          />
          <View style={styles.imageTopRow}>
            <View
              style={[
                styles.imageCategoryPill,
                { backgroundColor: `${card.accentColor}E6` },
              ]}
            >
              <Text style={styles.imageCategoryText}>{card.category}</Text>
            </View>
            <Text
              style={[
                styles.imageFavorite,
                card.isFavorite && { color: card.accentColor },
              ]}
            >
              ★
            </Text>
          </View>
          <View style={styles.imageBottomPanel}>
            <Text numberOfLines={2} style={styles.imageTitle}>
              {card.title}
            </Text>
            {card.subtitle ? (
              <Text numberOfLines={2} style={styles.imageSubtitle}>
                {card.subtitle}
              </Text>
            ) : (
              <Text numberOfLines={1} style={styles.imageSubtitle}>
                Imported reference image
              </Text>
            )}
          </View>
        </View>
      ) : (
        <View style={[styles.card, focused && styles.focusedCard]}>
          <View
            style={[styles.accentRail, { backgroundColor: card.accentColor }]}
          />
          <View style={styles.laminateShine} />
          <View style={styles.headerRow}>
            <View
              style={[
                styles.categoryPill,
                { backgroundColor: `${card.accentColor}24` },
              ]}
            >
              <Text style={[styles.categoryText, { color: card.accentColor }]}>
                {card.category}
              </Text>
            </View>
            <Text style={styles.codeText}>{card.code}</Text>
          </View>

          <Text numberOfLines={2} style={styles.title}>
            {card.title}
          </Text>
          <Text numberOfLines={2} style={styles.subtitle}>
            {card.subtitle}
          </Text>

          <View style={styles.divider} />

          <View style={styles.sections}>
            {card.sections.map((section) => (
              <View key={section.label} style={styles.sectionRow}>
                <Text numberOfLines={1} style={styles.sectionLabel}>
                  {section.label}
                </Text>
                <Text numberOfLines={1} style={styles.sectionValue}>
                  {section.value}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.footerRow}>
            <Text numberOfLines={1} style={styles.footerText}>
              {card.footer}
            </Text>
            <Text
              style={[
                styles.favorite,
                card.isFavorite && { color: card.accentColor },
              ]}
            >
              ★
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

export const BadgeReelCard = memo(BadgeReelCardComponent);

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 28,
  },
  card: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 28,
    backgroundColor: "#F8FAFC",
    padding: 22,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    boxShadow: "0 18px 22px rgba(0, 0, 0, 0.22)",
  },
  imageCard: {
    backgroundColor: "#020817",
    padding: 0,
    borderColor: "#FFFFFFCC",
  },
  imageScrim: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#02081722",
  },
  imageTopRow: {
    position: "absolute",
    left: 20,
    right: 20,
    top: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  imageCategoryPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  imageCategoryText: {
    color: "#04111F",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  imageFavorite: {
    color: "#F8FAFC99",
    fontSize: 24,
    fontWeight: "900",
    textShadowColor: "#00000080",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  imageBottomPanel: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    borderRadius: 22,
    backgroundColor: "#020817D9",
    borderWidth: 1,
    borderColor: "#FFFFFF1F",
    padding: 15,
  },
  imageTitle: {
    color: "#F8FAFC",
    fontSize: 22,
    fontWeight: "900",
  },
  imageSubtitle: {
    color: "#CBD5E1",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 5,
  },
  focusedCard: {
    boxShadow: "0 24px 30px rgba(0, 0, 0, 0.34)",
  },
  accentRail: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 9,
  },
  laminateShine: {
    position: "absolute",
    top: -42,
    right: -76,
    width: 180,
    height: 310,
    backgroundColor: "#FFFFFF4A",
    transform: [{ rotate: "24deg" }],
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  categoryPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  codeText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: {
    marginTop: 20,
    color: "#0F172A",
    fontSize: 27,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 6,
    color: "#475569",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 18,
  },
  sections: {
    gap: 10,
  },
  sectionRow: {
    borderRadius: 15,
    backgroundColor: "#EEF2F7",
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  sectionLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sectionValue: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 3,
  },
  footerRow: {
    marginTop: "auto",
    paddingTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  footerText: {
    flex: 1,
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
  },
  favorite: {
    color: "#CBD5E1",
    fontSize: 18,
    fontWeight: "900",
  },
});
