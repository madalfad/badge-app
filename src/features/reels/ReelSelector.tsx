import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { CARD_ACCENT_PRESETS } from "@/features/cards/cardMetadata";

import { DEFAULT_REEL_ID } from "./constants";
import type { CreateReelInput, ReelRecord, UpdateReelInput } from "./types";

type ReelSelectorProps = {
  reels: ReelRecord[];
  selectedReelId: string | null;
  allActiveCardCount: number;
  isLoading: boolean;
  onSelectReel: (reelId: string | null) => void;
  onCreateReel: (input: CreateReelInput) => Promise<string>;
  onUpdateReel: (reelId: string, patch: UpdateReelInput) => Promise<void>;
  onArchiveReel: (reelId: string) => Promise<void>;
  onDeleteReel: (reelId: string) => Promise<void>;
  onMoveReel: (reelId: string, direction: -1 | 1) => Promise<void>;
};

function getSelectedReelLabel(
  reels: ReelRecord[],
  selectedReelId: string | null,
) {
  if (!selectedReelId) {
    return "All cards";
  }
  return reels.find((reel) => reel.id === selectedReelId)?.name ?? "Reel";
}

export function ReelSelector({
  reels,
  selectedReelId,
  allActiveCardCount,
  isLoading,
  onSelectReel,
  onCreateReel,
  onUpdateReel,
  onArchiveReel,
  onDeleteReel,
  onMoveReel,
}: ReelSelectorProps) {
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const selectedLabel = getSelectedReelLabel(reels, selectedReelId);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>Current reel</Text>
          <Text style={styles.title}>{selectedLabel}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setIsManagerOpen(true)}
          style={({ pressed }) => [
            styles.manageButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.manageButtonText}>Manage</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.reelRow}
      >
        <SelectorChip
          label="All cards"
          detail={`${allActiveCardCount} active`}
          selected={selectedReelId === null}
          onPress={() => onSelectReel(null)}
        />
        {reels.map((reel) => (
          <SelectorChip
            key={reel.id}
            label={reel.name}
            detail={`${reel.activeCardCount} cards`}
            color={reel.color}
            selected={selectedReelId === reel.id}
            onPress={() => onSelectReel(reel.id)}
          />
        ))}
      </ScrollView>

      {isLoading ? (
        <Text style={styles.loadingText}>Loading reels…</Text>
      ) : null}

      <ReelManagerModal
        reels={reels}
        visible={isManagerOpen}
        onArchiveReel={onArchiveReel}
        onClose={() => setIsManagerOpen(false)}
        onCreateReel={onCreateReel}
        onDeleteReel={onDeleteReel}
        onMoveReel={onMoveReel}
        onUpdateReel={onUpdateReel}
      />
    </View>
  );
}

type SelectorChipProps = {
  label: string;
  detail: string;
  selected: boolean;
  color?: string | null;
  onPress: () => void;
};

function SelectorChip({
  label,
  detail,
  selected,
  color,
  onPress,
}: SelectorChipProps) {
  const accentColor = color ?? "#2DD4BF";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.selectorChip,
        selected && {
          borderColor: `${accentColor}AA`,
          backgroundColor: `${accentColor}20`,
        },
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[styles.selectorLabel, selected && styles.selectorLabelSelected]}
      >
        {label}
      </Text>
      <Text style={styles.selectorDetail}>{detail}</Text>
    </Pressable>
  );
}

type ReelManagerModalProps = Pick<
  ReelSelectorProps,
  | "reels"
  | "onArchiveReel"
  | "onCreateReel"
  | "onDeleteReel"
  | "onMoveReel"
  | "onUpdateReel"
> & {
  visible: boolean;
  onClose: () => void;
};

function ReelManagerModal({
  reels,
  visible,
  onArchiveReel,
  onClose,
  onCreateReel,
  onDeleteReel,
  onMoveReel,
  onUpdateReel,
}: ReelManagerModalProps) {
  const [editingReel, setEditingReel] = useState<ReelRecord | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(CARD_ACCENT_PRESETS[0]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!editingReel) {
      setName("");
      setColor(CARD_ACCENT_PRESETS[0]);
      return;
    }
    setName(editingReel.name);
    setColor(editingReel.color ?? CARD_ACCENT_PRESETS[0]);
  }, [editingReel]);

  const saveReel = async () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Give this reel a short name.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingReel) {
        await onUpdateReel(editingReel.id, { name, color });
      } else {
        await onCreateReel({ name, color });
      }
      setEditingReel(null);
      setName("");
      setColor(CARD_ACCENT_PRESETS[0]);
    } catch (caughtError) {
      Alert.alert(
        "Couldn’t save reel",
        caughtError instanceof Error ? caughtError.message : "Try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.managerSheet}>
          <View style={styles.managerHeader}>
            <View>
              <Text style={styles.managerEyebrow}>Local organization</Text>
              <Text style={styles.managerTitle}>Manage reels</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.managerContent}>
            <View style={styles.editorCard}>
              <Text style={styles.editorTitle}>
                {editingReel ? "Edit reel" : "Create reel"}
              </Text>
              <TextInput
                accessibilityLabel="Reel name"
                value={name}
                onChangeText={setName}
                placeholder="e.g. ICU shift, Pediatrics, Favorites"
                placeholderTextColor="#64748B"
                style={styles.nameInput}
              />
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
                  />
                ))}
              </View>
              <View style={styles.editorActionsRow}>
                {editingReel ? (
                  <SheetButton
                    label="Cancel"
                    variant="secondary"
                    onPress={() => setEditingReel(null)}
                  />
                ) : null}
                <SheetButton
                  label={
                    isSaving
                      ? "Saving…"
                      : editingReel
                        ? "Save reel"
                        : "Create reel"
                  }
                  disabled={isSaving}
                  onPress={saveReel}
                />
              </View>
            </View>

            <View style={styles.reelList}>
              {reels.map((reel, index) => (
                <ManagedReelRow
                  key={reel.id}
                  canMoveDown={index < reels.length - 1}
                  canMoveUp={index > 0}
                  reel={reel}
                  onArchive={() => onArchiveReel(reel.id)}
                  onDelete={() => onDeleteReel(reel.id)}
                  onEdit={() => setEditingReel(reel)}
                  onMoveDown={() => onMoveReel(reel.id, 1)}
                  onMoveUp={() => onMoveReel(reel.id, -1)}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

type ManagedReelRowProps = {
  reel: ReelRecord;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onArchive: () => Promise<void>;
  onDelete: () => Promise<void>;
};

function ManagedReelRow({
  reel,
  canMoveDown,
  canMoveUp,
  onArchive,
  onDelete,
  onEdit,
  onMoveDown,
  onMoveUp,
}: ManagedReelRowProps) {
  const isDefaultReel = reel.id === DEFAULT_REEL_ID;
  const confirmArchive = () => {
    Alert.alert(
      "Archive reel?",
      "Cards stay in your library and other reels.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Archive", style: "destructive", onPress: () => onArchive() },
      ],
    );
  };
  const confirmDelete = () => {
    Alert.alert("Delete reel?", "This removes only the reel, not its cards.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete() },
    ]);
  };

  return (
    <View style={styles.managedRow}>
      <View
        style={[styles.reelDot, { backgroundColor: reel.color ?? "#2DD4BF" }]}
      />
      <View style={styles.managedCopy}>
        <Text style={styles.managedName}>{reel.name}</Text>
        <Text style={styles.managedMeta}>
          {reel.activeCardCount} active cards{isDefaultReel ? " • default" : ""}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rowActions}
      >
        <MiniButton label="Edit" onPress={onEdit} />
        <MiniButton label="↑" disabled={!canMoveUp} onPress={onMoveUp} />
        <MiniButton label="↓" disabled={!canMoveDown} onPress={onMoveDown} />
        <MiniButton
          label="Archive"
          disabled={isDefaultReel}
          onPress={confirmArchive}
        />
        <MiniButton
          label="Delete"
          disabled={isDefaultReel}
          danger
          onPress={confirmDelete}
        />
      </ScrollView>
    </View>
  );
}

type SheetButtonProps = {
  label: string;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  onPress: () => void;
};

function SheetButton({
  label,
  disabled,
  variant = "primary",
  onPress,
}: SheetButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.sheetButton,
        variant === "secondary" && styles.secondaryButton,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.sheetButtonText,
          variant === "secondary" && styles.secondaryButtonText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type MiniButtonProps = {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onPress: () => void;
};

function MiniButton({ label, disabled, danger, onPress }: MiniButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.miniButton,
        danger && styles.dangerButton,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.miniButtonText, danger && styles.dangerButtonText]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#26364F",
    backgroundColor: "#101C2EE6",
    padding: 11,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  eyebrow: {
    color: "#2DD4BF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
  },
  manageButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2DD4BF66",
    backgroundColor: "#2DD4BF17",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  manageButtonText: {
    color: "#99F6E4",
    fontSize: 12,
    fontWeight: "900",
  },
  reelRow: {
    gap: 9,
    paddingRight: 2,
  },
  selectorChip: {
    minWidth: 112,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#26364F",
    backgroundColor: "#17243A",
    paddingHorizontal: 11,
    paddingVertical: 9,
    gap: 4,
  },
  selectorLabel: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "900",
  },
  selectorLabelSelected: {
    color: "#F8FAFC",
  },
  selectorDetail: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
  },
  loadingText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#020817CC",
    justifyContent: "flex-end",
  },
  managerSheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: "#26364F",
    backgroundColor: "#07111F",
    paddingTop: 18,
  },
  managerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 18,
  },
  managerEyebrow: {
    color: "#2DD4BF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  managerTitle: {
    color: "#F8FAFC",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 2,
  },
  closeButton: {
    borderRadius: 999,
    backgroundColor: "#17243A",
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  closeButtonText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "900",
  },
  managerContent: {
    padding: 18,
    paddingBottom: 32,
    gap: 14,
  },
  editorCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#26364F",
    backgroundColor: "#101C2E",
    padding: 14,
    gap: 12,
  },
  editorTitle: {
    color: "#F8FAFC",
    fontSize: 17,
    fontWeight: "900",
  },
  nameInput: {
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#26364F",
    backgroundColor: "#07111F",
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "800",
    paddingHorizontal: 13,
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  colorSwatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    borderColor: "#FFFFFF22",
  },
  selectedSwatch: {
    borderColor: "#F8FAFC",
  },
  editorActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 9,
  },
  sheetButton: {
    borderRadius: 16,
    backgroundColor: "#2DD4BF",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButton: {
    backgroundColor: "#17243A",
    borderWidth: 1,
    borderColor: "#26364F",
  },
  sheetButtonText: {
    color: "#04111F",
    fontSize: 13,
    fontWeight: "900",
  },
  secondaryButtonText: {
    color: "#CBD5E1",
  },
  reelList: {
    gap: 10,
  },
  managedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#26364F",
    backgroundColor: "#101C2E",
    padding: 12,
  },
  reelDot: {
    width: 14,
    height: 44,
    borderRadius: 999,
  },
  managedCopy: {
    flex: 1,
    minWidth: 110,
    gap: 3,
  },
  managedName: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "900",
  },
  managedMeta: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
  },
  rowActions: {
    gap: 7,
  },
  miniButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#26364F",
    backgroundColor: "#17243A",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  miniButtonText: {
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "900",
  },
  dangerButton: {
    borderColor: "#FB718566",
    backgroundColor: "#FB718517",
  },
  dangerButtonText: {
    color: "#FDA4AF",
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.78,
  },
});
