import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback, useMemo, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BadgeBottomNav } from "@/components/BadgeBottomNav";
import { BadgeIcon } from "@/components/BadgeIcon";
import {
  alpha,
  badgeColors,
  useBadgeLayout,
} from "@/components/badge-ui";
import { DEFAULT_REEL_ID } from "@/features/reels/constants";
import type { ReelRecord } from "@/features/reels/types";
import { useReels } from "@/features/reels/useReels";
import { subscribeToTabReset } from "@/navigation/tabResetEvents";

import { getReelIconName } from "./reelIcons";

export function ReelsScreen() {
  const router = useRouter();
  const layout = useBadgeLayout();
  const reelsState = useReels({ includeArchived: true });
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      reelsState.reload();
    }, [reelsState.reload]),
  );

  useFocusEffect(
    useCallback(
      () =>
        subscribeToTabReset("/reels", () => {
          scrollRef.current?.scrollTo({ y: 0, animated: true });
        }),
      [],
    ),
  );

  const activeReels = useMemo(
    () => reelsState.reels.filter((reel) => !reel.isArchived),
    [reelsState.reels],
  );
  const archivedReels = useMemo(
    () => reelsState.reels.filter((reel) => reel.isArchived),
    [reelsState.reels],
  );

  const selectReel = async (reelId: string | null) => {
    await reelsState.selectReel(reelId);
    router.replace("/");
  };

  const restoreReel = async (reel: ReelRecord) => {
    await reelsState.updateExistingReel(reel.id, { isArchived: false });
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <View
        style={[
          styles.shell,
          layout.contentMaxWidth ? { maxWidth: layout.contentMaxWidth } : null,
        ]}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Reels</Text>
              <Text style={styles.subtitle}>
                Sort badge cards into local sets by role, unit, or shift.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/reels/new" as Href)}
              style={({ pressed }) => [
                styles.newButton,
                pressed && styles.pressed,
              ]}
            >
              <BadgeIcon name="plus" color={badgeColors.onPrimary} size={18} />
              <Text style={styles.newButtonText}>New</Text>
            </Pressable>
          </View>

          <View style={styles.reelList}>
            <AllCardsRow
              activeCardCount={reelsState.allActiveCardCount}
              selected={reelsState.selectedReelId === null}
              onPress={() => selectReel(null)}
            />
            {activeReels.map((reel) => (
              <ReelRow
                key={reel.id}
                reel={reel}
                selected={reelsState.selectedReelId === reel.id}
                onEdit={() =>
                  router.push({
                    pathname: "/reels/[id]/edit",
                    params: { id: reel.id },
                  } as unknown as Href)
                }
                onPress={() => selectReel(reel.id)}
              />
            ))}
          </View>

          {archivedReels.length > 0 ? (
            <View style={styles.archivedSection}>
              <Text style={styles.sectionLabel}>Archived</Text>
              {archivedReels.map((reel) => (
                <ArchivedReelRow
                  key={reel.id}
                  reel={reel}
                  onRestore={() => restoreReel(reel)}
                />
              ))}
            </View>
          ) : null}
        </ScrollView>

        <BadgeBottomNav />
      </View>
    </SafeAreaView>
  );
}

type AllCardsRowProps = {
  activeCardCount: number;
  selected: boolean;
  onPress: () => void;
};

function AllCardsRow({ activeCardCount, selected, onPress }: AllCardsRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.reelRow,
        selected && styles.selectedRow,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.reelIconBox, { backgroundColor: "#2DD4BF22" }]}>
        <BadgeIcon name="layers" color={badgeColors.primary} size={21} />
      </View>
      <View style={styles.reelCopy}>
        <View style={styles.reelNameRow}>
          <Text numberOfLines={1} style={styles.reelName}>
            All Cards
          </Text>
          <Text style={styles.defaultPill}>Default</Text>
        </View>
        <Text style={styles.reelMeta}>{activeCardCount} active cards</Text>
      </View>
      <BadgeIcon
        name="chevron-right"
        color={badgeColors.textMuted}
        size={18}
      />
    </Pressable>
  );
}

type ReelRowProps = {
  reel: ReelRecord;
  selected: boolean;
  onEdit: () => void;
  onPress: () => void;
};

function ReelRow({ reel, selected, onEdit, onPress }: ReelRowProps) {
  const color = reel.color ?? badgeColors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.reelRow,
        selected && styles.selectedRow,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.reelIconBox, { backgroundColor: `${color}22` }]}>
        <BadgeIcon name={getReelIconName(reel.icon)} color={color} size={21} />
      </View>
      <View style={styles.reelCopy}>
        <View style={styles.reelNameRow}>
          <Text numberOfLines={1} style={styles.reelName}>
            {reel.name}
          </Text>
          {reel.id === DEFAULT_REEL_ID ? (
            <Text style={styles.defaultPill}>Default</Text>
          ) : null}
        </View>
        <Text style={styles.reelMeta}>
          {reel.activeCardCount} active / {reel.totalCardCount} total
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${reel.name}`}
        onPress={(event) => {
          event.stopPropagation();
          onEdit();
        }}
        style={styles.rowIconButton}
      >
        <BadgeIcon name="more-vertical" color={badgeColors.textMuted} size={18} />
      </Pressable>
      <BadgeIcon
        name="chevron-right"
        color={badgeColors.textMuted}
        size={18}
      />
    </Pressable>
  );
}

type ArchivedReelRowProps = {
  reel: ReelRecord;
  onRestore: () => void;
};

function ArchivedReelRow({ reel, onRestore }: ArchivedReelRowProps) {
  return (
    <View style={[styles.reelRow, styles.archivedRow]}>
      <View style={styles.reelIconBox}>
        <BadgeIcon name="archive" color={badgeColors.textDim} size={21} />
      </View>
      <View style={styles.reelCopy}>
        <Text numberOfLines={1} style={[styles.reelName, styles.archivedName]}>
          {reel.name}
        </Text>
        <Text style={styles.reelMeta}>{reel.totalCardCount} cards</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onRestore}
        style={({ pressed }) => [
          styles.restoreButton,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.restoreButtonText}>Restore</Text>
      </Pressable>
    </View>
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
  content: {
    padding: 16,
    paddingBottom: 26,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  title: {
    color: badgeColors.text,
    fontSize: 30,
    fontWeight: "900",
  },
  subtitle: {
    maxWidth: 270,
    color: badgeColors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 4,
  },
  newButton: {
    minHeight: 42,
    borderRadius: 21,
    backgroundColor: badgeColors.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
  },
  newButtonText: {
    color: badgeColors.onPrimary,
    fontSize: 13,
    fontWeight: "900",
  },
  reelList: {
    gap: 10,
  },
  reelRow: {
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: badgeColors.border,
    backgroundColor: badgeColors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  selectedRow: {
    borderColor: alpha(badgeColors.primary, "88"),
    backgroundColor: alpha(badgeColors.primary, "13"),
  },
  archivedRow: {
    opacity: 0.78,
  },
  reelIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: badgeColors.surfaceElevated,
  },
  reelCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  reelNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reelName: {
    color: badgeColors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  archivedName: {
    color: badgeColors.textMuted,
  },
  defaultPill: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: badgeColors.surfaceElevated,
    color: badgeColors.textMuted,
    fontSize: 10,
    fontWeight: "900",
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  reelMeta: {
    color: badgeColors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  rowIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: badgeColors.inputBg,
  },
  archivedSection: {
    gap: 10,
    paddingTop: 6,
  },
  sectionLabel: {
    color: badgeColors.textDim,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  restoreButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: alpha(badgeColors.primary, "55"),
    backgroundColor: alpha(badgeColors.primary, "12"),
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  restoreButtonText: {
    color: "#99F6E4",
    fontSize: 11,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.78,
  },
});
