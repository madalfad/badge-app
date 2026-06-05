import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BadgeIcon } from "@/components/BadgeIcon";
import {
  alpha,
  badgeColors,
  useBadgeLayout,
} from "@/components/badge-ui";
import { CARD_ACCENT_PRESETS } from "@/features/cards/cardMetadata";
import { DEFAULT_REEL_COLOR, DEFAULT_REEL_ID } from "@/features/reels/constants";
import { useReels } from "@/features/reels/useReels";

import { getReelIconName, REEL_ICON_OPTIONS } from "./reelIcons";

type ReelEditScreenProps = {
  mode?: "create" | "edit";
};

function getRouteReelId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : (value ?? null);
}

export function ReelEditScreen({ mode = "edit" }: ReelEditScreenProps) {
  const router = useRouter();
  const layout = useBadgeLayout();
  const params = useLocalSearchParams<{ id?: string }>();
  const reelId = getRouteReelId(params.id);
  const reelsState = useReels({ includeArchived: true });
  const existingReel = useMemo(
    () => reelsState.reels.find((reel) => reel.id === reelId) ?? null,
    [reelId, reelsState.reels],
  );
  const isCreate = mode === "create";
  const isDefaultReel = existingReel?.id === DEFAULT_REEL_ID;
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_REEL_COLOR);
  const [icon, setIcon] = useState("badge");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isCreate || !existingReel) {
      return;
    }

    setName(existingReel.name);
    setColor(existingReel.color ?? DEFAULT_REEL_COLOR);
    setIcon(existingReel.icon ?? "badge");
  }, [existingReel, isCreate]);

  const title = isCreate ? "New reel" : "Edit reel";
  const canSave = name.trim().length > 0 && !isSaving;

  const saveReel = async () => {
    if (!canSave) {
      return;
    }

    setIsSaving(true);
    try {
      if (isCreate) {
        await reelsState.createNewReel({ name, color, icon });
      } else if (existingReel) {
        await reelsState.updateExistingReel(existingReel.id, {
          name,
          color,
          icon,
        });
      }
      router.replace("/reels" as Href);
    } catch (caughtError) {
      Alert.alert(
        "Couldn’t save reel",
        caughtError instanceof Error ? caughtError.message : "Try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const archiveReel = () => {
    if (!existingReel || isDefaultReel) {
      return;
    }

    Alert.alert("Archive reel?", "Cards stay in your library.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Archive",
        style: "destructive",
        onPress: async () => {
          setIsSaving(true);
          try {
            await reelsState.archiveExistingReel(existingReel.id);
            router.replace("/reels" as Href);
          } finally {
            setIsSaving(false);
          }
        },
      },
    ]);
  };

  const restoreReel = async () => {
    if (!existingReel) {
      return;
    }

    setIsSaving(true);
    try {
      await reelsState.updateExistingReel(existingReel.id, {
        isArchived: false,
      });
      router.replace("/reels" as Href);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteReel = () => {
    if (!existingReel || isDefaultReel) {
      return;
    }

    Alert.alert("Delete reel?", "This removes only the reel, not its cards.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setIsSaving(true);
          try {
            await reelsState.deleteExistingReel(existingReel.id);
            router.replace("/reels" as Href);
          } finally {
            setIsSaving(false);
          }
        },
      },
    ]);
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
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.roundButton,
              pressed && styles.pressed,
            ]}
          >
            <BadgeIcon name="arrow-left" color={badgeColors.text} size={20} />
          </Pressable>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {title}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={!canSave}
            onPress={saveReel}
            style={({ pressed }) => [
              styles.saveButton,
              !canSave && styles.disabled,
              pressed && canSave && styles.pressed,
            ]}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? "Saving..." : "Save"}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.previewCard}>
            <View style={[styles.previewIcon, { backgroundColor: `${color}22` }]}>
              <BadgeIcon name={getReelIconName(icon)} color={color} size={24} />
            </View>
            <View style={styles.previewCopy}>
              <Text numberOfLines={1} style={styles.previewName}>
                {name.trim() || "Reel name"}
              </Text>
              <Text style={styles.previewMeta}>
                {existingReel
                  ? `${existingReel.activeCardCount} active / ${existingReel.totalCardCount} total`
                  : "Local reel"}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Reel name</Text>
            <TextInput
              accessibilityLabel="Reel name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. ICU, Shift Favorites"
              placeholderTextColor={badgeColors.textDim}
              style={styles.input}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Color</Text>
            <View style={styles.colorRow}>
              {CARD_ACCENT_PRESETS.map((preset) => (
                <Pressable
                  key={preset}
                  accessibilityRole="button"
                  accessibilityState={{ selected: color === preset }}
                  onPress={() => setColor(preset)}
                  style={({ pressed }) => [
                    styles.colorSwatch,
                    { backgroundColor: preset },
                    color === preset && styles.selectedSwatch,
                    pressed && styles.pressed,
                  ]}
                >
                  {color === preset ? (
                    <BadgeIcon
                      name="check"
                      color={badgeColors.onPrimary}
                      size={17}
                    />
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Icon</Text>
            <View style={styles.iconGrid}>
              {REEL_ICON_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: icon === option.value }}
                  onPress={() => setIcon(option.value)}
                  style={({ pressed }) => [
                    styles.iconChoice,
                    icon === option.value && styles.iconChoiceSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <BadgeIcon
                    name={option.icon}
                    color={
                      icon === option.value
                        ? badgeColors.primary
                        : badgeColors.textMuted
                    }
                    size={20}
                  />
                </Pressable>
              ))}
            </View>
          </View>

          {!isCreate && existingReel ? (
            <View style={styles.dangerSection}>
              {existingReel.isArchived ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={isSaving}
                  onPress={restoreReel}
                  style={({ pressed }) => [
                    styles.outlineButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <BadgeIcon
                    name="refresh"
                    color={badgeColors.primary}
                    size={17}
                  />
                  <Text style={styles.outlineButtonText}>Restore reel</Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={isSaving || isDefaultReel}
                  onPress={archiveReel}
                  style={({ pressed }) => [
                    styles.outlineButton,
                    (isSaving || isDefaultReel) && styles.disabled,
                    pressed && !isDefaultReel && styles.pressed,
                  ]}
                >
                  <BadgeIcon
                    name="archive"
                    color={badgeColors.text}
                    size={17}
                  />
                  <Text style={styles.outlineButtonText}>Archive reel</Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                disabled={isSaving || isDefaultReel}
                onPress={deleteReel}
                style={({ pressed }) => [
                  styles.deleteButton,
                  (isSaving || isDefaultReel) && styles.disabled,
                  pressed && !isDefaultReel && styles.pressed,
                ]}
              >
                <BadgeIcon name="trash" color="#FCA5A5" size={17} />
                <Text style={styles.deleteButtonText}>Delete reel</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
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
  },
  header: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  roundButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: badgeColors.border,
    backgroundColor: badgeColors.surface,
  },
  headerTitle: {
    flex: 1,
    color: badgeColors.text,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  saveButton: {
    minWidth: 68,
    minHeight: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: badgeColors.primary,
    paddingHorizontal: 12,
  },
  saveButtonText: {
    color: badgeColors.onPrimary,
    fontSize: 13,
    fontWeight: "900",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  previewCard: {
    minHeight: 84,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: badgeColors.border,
    backgroundColor: badgeColors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  previewIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  previewCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  previewName: {
    color: badgeColors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  previewMeta: {
    color: badgeColors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  section: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: badgeColors.border,
    backgroundColor: badgeColors.surface,
    padding: 14,
    gap: 10,
  },
  sectionLabel: {
    color: badgeColors.textMuted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  input: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: badgeColors.border,
    backgroundColor: badgeColors.inputBg,
    color: badgeColors.text,
    fontSize: 15,
    fontWeight: "800",
    paddingHorizontal: 12,
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF22",
  },
  selectedSwatch: {
    borderColor: badgeColors.text,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  iconChoice: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: badgeColors.border,
    backgroundColor: badgeColors.inputBg,
  },
  iconChoiceSelected: {
    borderColor: alpha(badgeColors.primary, "88"),
    backgroundColor: alpha(badgeColors.primary, "17"),
  },
  dangerSection: {
    gap: 10,
    paddingTop: 4,
  },
  outlineButton: {
    minHeight: 46,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: badgeColors.border,
    backgroundColor: badgeColors.inputBg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  outlineButtonText: {
    color: badgeColors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  deleteButton: {
    minHeight: 46,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: alpha(badgeColors.danger, "66"),
    backgroundColor: alpha(badgeColors.danger, "17"),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  deleteButtonText: {
    color: "#FCA5A5",
    fontSize: 13,
    fontWeight: "900",
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.78,
  },
});
