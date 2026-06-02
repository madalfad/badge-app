import * as Haptics from "expo-haptics";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDatabaseContext } from "@/db/DatabaseProvider";
import {
  archiveCardRecord,
  restoreCardRecord,
  toggleCardFavorite,
} from "@/features/cards/cardService";
import { useCard } from "@/features/cards/useCard";
import { BadgeReelCard } from "@/features/reel/BadgeReelCard";

import { ZoomableImage } from "./ZoomableImage";

function getRouteCardId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : (value ?? null);
}

export function CardViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const cardId = getRouteCardId(params.id);
  const { db } = useDatabaseContext();
  const { card, assets, tags, error, isLoading, reload } = useCard(cardId);
  const [activeSide, setActiveSide] = useState("front");
  const [controlsVisible, setControlsVisible] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  const activeAsset = useMemo(() => {
    const preferred = assets.find((asset) => asset.side === activeSide);
    return preferred ?? assets[0] ?? null;
  }, [activeSide, assets]);

  const activeImageUri =
    activeAsset?.displayUri ?? activeAsset?.fileUri ?? null;
  const placeholderUri = activeAsset?.thumbnailUri ?? null;
  const availableSides = useMemo(
    () =>
      assets
        .filter((asset) => asset.side === "front" || asset.side === "back")
        .sort((left, right) => {
          const sideOrder = { front: 0, back: 1 } as const;
          return (
            sideOrder[left.side as "front" | "back"] -
            sideOrder[right.side as "front" | "back"]
          );
        }),
    [assets],
  );

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const toggleFavorite = useCallback(async () => {
    if (!db || !cardId) {
      return;
    }

    setIsMutating(true);
    try {
      await toggleCardFavorite(db, cardId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      await reload();
    } finally {
      setIsMutating(false);
    }
  }, [cardId, db, reload]);

  const archiveCard = useCallback(() => {
    if (!db || !cardId) {
      return;
    }

    Alert.alert(
      "Archive card?",
      "Archived cards are hidden from the main reel but can be restored from the Archived filter.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            setIsMutating(true);
            try {
              await archiveCardRecord(db, cardId);
              router.replace("/");
            } finally {
              setIsMutating(false);
            }
          },
        },
      ],
    );
  }, [cardId, db, router]);

  const restoreCard = useCallback(async () => {
    if (!db || !cardId) {
      return;
    }

    setIsMutating(true);
    try {
      await restoreCardRecord(db, cardId);
      await reload();
    } finally {
      setIsMutating(false);
    }
  }, [cardId, db, reload]);

  if (isLoading) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator color="#2DD4BF" />
        <Text style={styles.centeredStateText}>Opening card…</Text>
      </View>
    );
  }

  if (!card || error) {
    return (
      <SafeAreaView style={styles.centeredState}>
        <Text style={styles.errorTitle}>Card unavailable</Text>
        <Text style={styles.errorText}>
          {error?.message ?? "This card could not be loaded."}
        </Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.replace("/")}
        >
          <Text style={styles.primaryButtonText}>Back to reel</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.screen, highContrast && styles.highContrastScreen]}>
      {activeImageUri ? (
        <ZoomableImage
          uri={activeImageUri}
          placeholderUri={placeholderUri}
          highContrast={highContrast}
          imageWidth={activeAsset?.width}
          imageHeight={activeAsset?.height}
          onSingleTap={() => setControlsVisible((visible) => !visible)}
        />
      ) : (
        <Pressable
          style={styles.demoCardViewer}
          onPress={() => setControlsVisible((visible) => !visible)}
        >
          <BadgeReelCard
            card={card}
            focused
            width={320}
            height={460}
            onPress={() => setControlsVisible((visible) => !visible)}
            onDoublePress={toggleFavorite}
            onLongPress={toggleFavorite}
          />
        </Pressable>
      )}

      {controlsVisible ? (
        <SafeAreaView pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View style={styles.topControls}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              style={styles.roundButton}
            >
              <Text style={styles.roundButtonText}>‹</Text>
            </Pressable>
            <View style={styles.titleBlock}>
              <Text numberOfLines={1} style={styles.viewerTitle}>
                {card.title}
              </Text>
              <Text numberOfLines={1} style={styles.viewerSubtitle}>
                {card.category}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={isMutating}
              onPress={toggleFavorite}
              style={[
                styles.roundButton,
                card.isFavorite && { borderColor: card.accentColor },
              ]}
            >
              <Text
                style={[
                  styles.starText,
                  card.isFavorite && { color: card.accentColor },
                ]}
              >
                ★
              </Text>
            </Pressable>
          </View>

          <View style={styles.bottomSheet}>
            {availableSides.length > 1 ? (
              <View style={styles.sideToggleRow}>
                {availableSides.map((asset) => (
                  <Pressable
                    key={asset.id}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: activeAsset?.id === asset.id,
                    }}
                    onPress={() => setActiveSide(asset.side)}
                    style={[
                      styles.sideToggle,
                      activeAsset?.id === asset.id && styles.sideToggleSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.sideToggleText,
                        activeAsset?.id === asset.id &&
                          styles.sideToggleTextSelected,
                      ]}
                    >
                      {asset.side === "front" ? "Front" : "Back"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={styles.metadataRow}>
              <InfoPill
                label={
                  activeImageUri
                    ? "Pinch / pan / double tap"
                    : "Seeded demo card"
                }
              />
              {highContrast ? <InfoPill label="High contrast" /> : null}
              {card.isArchived ? <InfoPill label="Archived" /> : null}
              {tags.map((tag) => (
                <InfoPill key={tag} label={`#${tag}`} />
              ))}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.actionRow}
            >
              <ViewerAction
                label={highContrast ? "Normal background" : "High contrast"}
                onPress={() => setHighContrast((value) => !value)}
              />
              <ViewerAction
                label={card.isFavorite ? "Unfavorite" : "Favorite"}
                onPress={toggleFavorite}
                disabled={isMutating}
              />
              <ViewerAction
                label="Edit card"
                onPress={() => {
                  if (cardId) {
                    router.push({
                      pathname: "/card/[id]/edit",
                      params: { id: cardId },
                    });
                  }
                }}
              />
              {card.isArchived ? (
                <ViewerAction
                  label="Restore"
                  onPress={restoreCard}
                  disabled={isMutating}
                />
              ) : (
                <ViewerAction
                  label="Archive"
                  onPress={archiveCard}
                  disabled={isMutating}
                  danger
                />
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      ) : null}
    </View>
  );
}

type InfoPillProps = {
  label: string;
};

function InfoPill({ label }: InfoPillProps) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoPillText}>{label}</Text>
    </View>
  );
}

type ViewerActionProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
};

function ViewerAction({ label, onPress, disabled, danger }: ViewerActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.viewerAction,
        danger && styles.viewerActionDanger,
        disabled && styles.disabledAction,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.viewerActionText,
          danger && styles.viewerActionDangerText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#07111F",
  },
  highContrastScreen: {
    backgroundColor: "#000000",
  },
  centeredState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#07111F",
    padding: 24,
  },
  centeredStateText: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 12,
  },
  errorTitle: {
    color: "#F8FAFC",
    fontSize: 24,
    fontWeight: "900",
  },
  errorText: {
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 18,
  },
  primaryButton: {
    borderRadius: 16,
    backgroundColor: "#2DD4BF",
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  primaryButtonText: {
    color: "#04111F",
    fontSize: 14,
    fontWeight: "900",
  },
  demoCardViewer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  topControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  roundButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#020817D9",
    borderWidth: 1,
    borderColor: "#FFFFFF24",
  },
  roundButtonText: {
    color: "#F8FAFC",
    fontSize: 34,
    lineHeight: 34,
    fontWeight: "500",
  },
  titleBlock: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: "#020817D9",
    borderWidth: 1,
    borderColor: "#FFFFFF24",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  viewerTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "900",
  },
  viewerSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  starText: {
    color: "#F8FAFC99",
    fontSize: 22,
    fontWeight: "900",
  },
  bottomSheet: {
    marginTop: "auto",
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#FFFFFF24",
    backgroundColor: "#020817E6",
    padding: 14,
    gap: 12,
  },
  sideToggleRow: {
    flexDirection: "row",
    gap: 8,
  },
  sideToggle: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#26364F",
    backgroundColor: "#17243A",
    alignItems: "center",
    paddingVertical: 11,
  },
  sideToggleSelected: {
    backgroundColor: "#2DD4BF22",
    borderColor: "#2DD4BF99",
  },
  sideToggleText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "900",
  },
  sideToggleTextSelected: {
    color: "#F8FAFC",
  },
  metadataRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  infoPill: {
    borderRadius: 999,
    backgroundColor: "#17243A",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  infoPillText: {
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "800",
  },
  actionRow: {
    gap: 8,
  },
  viewerAction: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#26364F",
    backgroundColor: "#17243A",
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  viewerActionDanger: {
    backgroundColor: "#F871711F",
    borderColor: "#F8717166",
  },
  viewerActionText: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "900",
  },
  viewerActionDangerText: {
    color: "#FCA5A5",
  },
  disabledAction: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.78,
  },
});
