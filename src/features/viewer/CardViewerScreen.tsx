import * as Haptics from "expo-haptics";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useBadgeLayout } from "@/components/badge-ui";
import { useDatabaseContext } from "@/db/DatabaseProvider";
import {
  CardLoadingState,
  CardUnavailableState,
} from "@/features/cards/CardRouteStates";
import {
  archiveCardRecord,
  restoreCardRecord,
  toggleCardFavorite,
} from "@/features/cards/cardService";
import type { BadgeCard, CardAssetRecord } from "@/features/cards/types";
import { useCard } from "@/features/cards/useCard";
import { BadgeReelCard } from "@/features/reel/BadgeReelCard";
import { getBadgeCardRenderSize } from "@/features/reel/cardSizing";

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
  const flipSide = useCallback(
    (direction: "left" | "right" = "left") => {
      if (availableSides.length <= 1) {
        return false;
      }

      const currentIndex = Math.max(
        availableSides.findIndex((asset) => asset.side === activeAsset?.side),
        0,
      );
      const delta = direction === "left" ? 1 : -1;
      const nextIndex =
        (currentIndex + delta + availableSides.length) % availableSides.length;
      setActiveSide(availableSides[nextIndex].side);
      return true;
    },
    [activeAsset?.side, availableSides],
  );
  const handleStageTap = useCallback(() => {
    if (flipSide()) {
      return;
    }
    setControlsVisible((visible) => !visible);
  }, [flipSide]);

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

  const editCard = useCallback(() => {
    if (!cardId) {
      return;
    }

    router.push({
      pathname: "/card/[id]/edit",
      params: { id: cardId },
    });
  }, [cardId, router]);

  if (isLoading) {
    return <CardLoadingState message="Opening card…" />;
  }

  if (!card || error) {
    return (
      <CardUnavailableState
        message={error?.message ?? "This card could not be loaded."}
        onBackToReel={() => router.replace("/")}
      />
    );
  }

  return (
    <View style={[styles.screen, highContrast && styles.highContrastScreen]}>
      <CardViewerStage
        activeAsset={activeAsset}
        activeImageUri={activeImageUri}
        card={card}
        highContrast={highContrast}
        placeholderUri={placeholderUri}
        onFlipSide={flipSide}
        onStageTap={handleStageTap}
        onToggleFavorite={toggleFavorite}
      />

      {controlsVisible ? (
        <ViewerControls
          activeAsset={activeAsset}
          activeImageUri={activeImageUri}
          availableSides={availableSides}
          card={card}
          highContrast={highContrast}
          isMutating={isMutating}
          tags={tags}
          onArchive={archiveCard}
          onBack={() => router.back()}
          onEdit={editCard}
          onRestore={restoreCard}
          onSelectSide={setActiveSide}
          onToggleFavorite={toggleFavorite}
          onToggleHighContrast={() => setHighContrast((value) => !value)}
        />
      ) : null}
    </View>
  );
}

type CardViewerStageProps = {
  activeAsset: CardAssetRecord | null;
  activeImageUri: string | null;
  card: BadgeCard;
  highContrast: boolean;
  placeholderUri: string | null;
  onFlipSide: (direction?: "left" | "right") => boolean;
  onStageTap: () => void;
  onToggleFavorite: () => void;
};

function CardViewerStage({
  activeAsset,
  activeImageUri,
  card,
  highContrast,
  placeholderUri,
  onFlipSide,
  onStageTap,
  onToggleFavorite,
}: CardViewerStageProps) {
  const layout = useBadgeLayout();
  const fallbackMaxWidth = Math.min(layout.width - 54, 340);
  const fallbackMaxHeight = Math.min(
    fallbackMaxWidth * 1.68,
    layout.height * 0.68,
  );
  const fallbackSize = getBadgeCardRenderSize(
    card,
    fallbackMaxWidth,
    fallbackMaxHeight,
  );

  if (activeImageUri) {
    return (
      <ZoomableImage
        uri={activeImageUri}
        placeholderUri={placeholderUri}
        highContrast={highContrast}
        imageWidth={activeAsset?.width}
        imageHeight={activeAsset?.height}
        onHorizontalSwipe={(direction) => {
          onFlipSide(direction);
        }}
        onSingleTap={onStageTap}
      />
    );
  }

  return (
    <Pressable style={styles.demoCardViewer} onPress={onStageTap}>
      <BadgeReelCard
        card={card}
        focused
        width={fallbackSize.width}
        height={fallbackSize.height}
        onPress={onStageTap}
        onDoublePress={onToggleFavorite}
        onLongPress={onToggleFavorite}
      />
    </Pressable>
  );
}

type ViewerControlsProps = {
  activeAsset: CardAssetRecord | null;
  activeImageUri: string | null;
  availableSides: CardAssetRecord[];
  card: BadgeCard;
  highContrast: boolean;
  isMutating: boolean;
  tags: string[];
  onArchive: () => void;
  onBack: () => void;
  onEdit: () => void;
  onRestore: () => void;
  onSelectSide: (side: string) => void;
  onToggleFavorite: () => void;
  onToggleHighContrast: () => void;
};

function ViewerControls({
  activeAsset,
  activeImageUri,
  availableSides,
  card,
  highContrast,
  isMutating,
  tags,
  onArchive,
  onBack,
  onEdit,
  onRestore,
  onSelectSide,
  onToggleFavorite,
  onToggleHighContrast,
}: ViewerControlsProps) {
  const layout = useBadgeLayout();

  return (
    <SafeAreaView pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.topControls,
          { maxWidth: layout.contentMaxWidth, width: "100%" },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
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
          onPress={onToggleFavorite}
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
        <SideToggleRow
          activeAsset={activeAsset}
          availableSides={availableSides}
          onSelectSide={onSelectSide}
        />
        <MetadataPills
          activeImageUri={activeImageUri}
          card={card}
          highContrast={highContrast}
          tags={tags}
        />
        <ViewerActionRow
          card={card}
          highContrast={highContrast}
          isMutating={isMutating}
          onArchive={onArchive}
          onEdit={onEdit}
          onRestore={onRestore}
          onToggleFavorite={onToggleFavorite}
          onToggleHighContrast={onToggleHighContrast}
        />
      </View>
    </SafeAreaView>
  );
}

type SideToggleRowProps = {
  activeAsset: CardAssetRecord | null;
  availableSides: CardAssetRecord[];
  onSelectSide: (side: string) => void;
};

function SideToggleRow({
  activeAsset,
  availableSides,
  onSelectSide,
}: SideToggleRowProps) {
  if (availableSides.length <= 1) {
    return null;
  }

  return (
    <View style={styles.sideToggleRow}>
      {availableSides.map((asset) => (
        <Pressable
          key={asset.id}
          accessibilityRole="button"
          accessibilityState={{ selected: activeAsset?.id === asset.id }}
          onPress={() => onSelectSide(asset.side)}
          style={[
            styles.sideToggle,
            activeAsset?.id === asset.id && styles.sideToggleSelected,
          ]}
        >
          <Text
            style={[
              styles.sideToggleText,
              activeAsset?.id === asset.id && styles.sideToggleTextSelected,
            ]}
          >
            {asset.side === "front" ? "Front" : "Back"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

type MetadataPillsProps = {
  activeImageUri: string | null;
  card: BadgeCard;
  highContrast: boolean;
  tags: string[];
};

function MetadataPills({
  activeImageUri,
  card,
  highContrast,
  tags,
}: MetadataPillsProps) {
  const interactionLabel = activeImageUri
    ? "Pinch / pan / double tap"
    : card.sourceType === "sample_seed"
      ? "Seeded demo card"
      : "Text badge card";

  return (
    <View style={styles.metadataRow}>
      <InfoPill label={interactionLabel} />
      {highContrast ? <InfoPill label="High contrast" /> : null}
      {card.isArchived ? <InfoPill label="Archived" /> : null}
      {tags.map((tag) => (
        <InfoPill key={tag} label={`#${tag}`} />
      ))}
    </View>
  );
}

type ViewerActionRowProps = {
  card: BadgeCard;
  highContrast: boolean;
  isMutating: boolean;
  onArchive: () => void;
  onEdit: () => void;
  onRestore: () => void;
  onToggleFavorite: () => void;
  onToggleHighContrast: () => void;
};

function ViewerActionRow({
  card,
  highContrast,
  isMutating,
  onArchive,
  onEdit,
  onRestore,
  onToggleFavorite,
  onToggleHighContrast,
}: ViewerActionRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.actionRow}
    >
      <ViewerAction
        label={highContrast ? "Normal background" : "High contrast"}
        onPress={onToggleHighContrast}
      />
      <ViewerAction
        label={card.isFavorite ? "Unfavorite" : "Favorite"}
        onPress={onToggleFavorite}
        disabled={isMutating}
      />
      <ViewerAction label="Edit card" onPress={onEdit} />
      {card.isArchived ? (
        <ViewerAction
          label="Restore"
          onPress={onRestore}
          disabled={isMutating}
        />
      ) : (
        <ViewerAction
          label="Archive"
          onPress={onArchive}
          disabled={isMutating}
          danger
        />
      )}
    </ScrollView>
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

  demoCardViewer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  topControls: {
    alignSelf: "center",
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
    alignSelf: "center",
    width: "92%",
    maxWidth: 402,
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
