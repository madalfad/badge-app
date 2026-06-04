import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { ReelRecord } from "./types";

type ReelMembershipFieldProps = {
  reels: ReelRecord[];
  selectedReelIds: string[];
  disabled?: boolean;
  onChange: (reelIds: string[]) => void;
};

function toggleMembership(
  selectedReelIds: string[],
  reelId: string,
  isSelected: boolean,
) {
  if (isSelected && selectedReelIds.length <= 1) {
    return selectedReelIds;
  }

  if (isSelected) {
    return selectedReelIds.filter((selectedId) => selectedId !== reelId);
  }

  return [...selectedReelIds, reelId];
}

export function ReelMembershipField({
  reels,
  selectedReelIds,
  disabled,
  onChange,
}: ReelMembershipFieldProps) {
  const selectedSet = new Set(selectedReelIds);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.sectionTitle}>Reels</Text>
          <Text style={styles.helperText}>
            Add this card to one or more local reels without duplicating files.
          </Text>
        </View>
        <Text style={styles.countText}>{selectedReelIds.length} selected</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.reelRow}
      >
        {reels.map((reel) => {
          const isSelected = selectedSet.has(reel.id);
          return (
            <Pressable
              key={reel.id}
              accessibilityRole="button"
              accessibilityState={{ disabled, selected: isSelected }}
              disabled={disabled}
              onPress={() =>
                onChange(toggleMembership(selectedReelIds, reel.id, isSelected))
              }
              style={({ pressed }) => [
                styles.reelChip,
                isSelected && {
                  borderColor: `${reel.color ?? "#2DD4BF"}AA`,
                  backgroundColor: `${reel.color ?? "#2DD4BF"}22`,
                },
                disabled && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[styles.reelName, isSelected && styles.reelNameSelected]}
              >
                {reel.name}
              </Text>
              <Text style={styles.reelCount}>{reel.activeCardCount} cards</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#26364F",
    backgroundColor: "#101C2E",
    padding: 16,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 5,
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "900",
  },
  helperText: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  countText: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#17243A",
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reelRow: {
    gap: 9,
    paddingRight: 2,
  },
  reelChip: {
    minWidth: 122,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#26364F",
    backgroundColor: "#07111F",
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 4,
  },
  reelName: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "900",
  },
  reelNameSelected: {
    color: "#F8FAFC",
  },
  reelCount: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.78,
  },
});
