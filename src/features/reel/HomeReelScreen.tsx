import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BadgeBottomNav } from "@/components/BadgeBottomNav";
import { BadgeIcon } from "@/components/BadgeIcon";
import { badgeColors, useBadgeLayout } from "@/components/badge-ui";
import { useDatabaseContext } from "@/db/DatabaseProvider";
import { removeCardFromReel } from "@/db/repositories/reelsRepository";
import type { BadgeCard } from "@/features/cards/types";
import { useCards } from "@/features/cards/useCards";
import { useReels } from "@/features/reels/useReels";
import { getCardArchiveBuckets } from "@/features/search/useFilteredCards";
import { useBooleanSetting } from "@/features/settings/useBooleanSetting";
import { subscribeToTabReset } from "@/navigation/tabResetEvents";

import { BadgeReel } from "./BadgeReel";

export function HomeReelScreen() {
  const router = useRouter();
  const layout = useBadgeLayout();
  const { db } = useDatabaseContext();
  const reelsState = useReels();
  const {
    cards,
    error,
    isLoading,
    isPersisted,
    markCardViewed,
    reload,
    toggleFavorite,
  } = useCards({ reelId: reelsState.selectedReelId });
  const [reduceMotion] = useBooleanSetting("reduce_motion_enabled", false);
  const [hapticsEnabled] = useBooleanSetting("haptics_enabled", true);
  const [quickActionCard, setQuickActionCard] = useState<BadgeCard | null>(
    null,
  );
  const [reelResetSignal, setReelResetSignal] = useState(0);
  const reloadReels = reelsState.reload;

  useFocusEffect(
    useCallback(() => {
      reload();
      reloadReels().catch(() => undefined);
    }, [reload, reloadReels]),
  );

  useFocusEffect(
    useCallback(
      () =>
        subscribeToTabReset("/", () => {
          setReelResetSignal((value) => value + 1);
        }),
      [],
    ),
  );

  const { activeCards, archivedCards } = useMemo(
    () => getCardArchiveBuckets(cards),
    [cards],
  );
  const selectedReelLabel = reelsState.selectedReelId
    ? (reelsState.reels.find((reel) => reel.id === reelsState.selectedReelId)
        ?.name ?? "Reel")
    : "All cards";

  const handleFavoriteToggle = async (cardToToggle: BadgeCard) => {
    await toggleFavorite(cardToToggle.id);
    if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
    }
  };

  const handleCardPress = async (card: BadgeCard) => {
    await markCardViewed(card.id);
    router.push({ pathname: "/card/[id]", params: { id: card.id } });
  };

  const closeQuickActions = () => setQuickActionCard(null);

  const favoriteQuickActionCard = () => {
    if (!quickActionCard) {
      return;
    }

    handleFavoriteToggle(quickActionCard);
    closeQuickActions();
  };

  const openQuickActionCard = () => {
    if (!quickActionCard) {
      return;
    }

    handleCardPress(quickActionCard);
    closeQuickActions();
  };

  const editQuickActionCard = () => {
    if (!quickActionCard) {
      return;
    }

    router.push({
      pathname: "/card/[id]/edit",
      params: { id: quickActionCard.id },
    });
    closeQuickActions();
  };

  const removeQuickActionCardFromReel = async () => {
    if (!db || !quickActionCard || !reelsState.selectedReelId) {
      return;
    }

    await removeCardFromReel(db, reelsState.selectedReelId, quickActionCard.id);
    closeQuickActions();
    await Promise.all([reload(), reelsState.reload()]);
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <View
          style={[
            styles.homeShell,
            layout.contentMaxWidth ? { maxWidth: layout.contentMaxWidth } : null,
          ]}
        >
          <View style={styles.appBar}>
            <View style={styles.titleCluster}>
              <Text style={styles.appEyebrow}>BadgeDeck</Text>
              <Text numberOfLines={1} style={styles.appTitle}>
                {selectedReelLabel}
              </Text>
              <Text numberOfLines={1} style={styles.appMeta}>
                {activeCards.length} active / {isPersisted ? "local" : "demo"}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <HeaderIconButton
                icon="search"
                label="Search"
                onPress={() => router.push("/search")}
              />
              <HeaderIconButton
                icon="settings"
                label="Settings"
                onPress={() => router.push("/settings")}
              />
            </View>
          </View>

          {error ? (
            <InlineNotice
              title={isPersisted ? "Database warning" : "Demo fallback active"}
              text={
                isPersisted
                  ? error.message
                  : "Native SQLite is unavailable here, so BadgeDeck is showing demo cards. Use a standalone build for local storage."
              }
            />
          ) : null}

          <View
            style={[
              styles.reelWrapper,
              layout.isCompactHeight && styles.compactReelWrapper,
            ]}
          >
            <HomeReelContent
              activeCards={activeCards}
              archivedCards={archivedCards}
              hapticsEnabled={hapticsEnabled}
              isLoading={isLoading}
              reduceMotion={reduceMotion}
              onAddCard={() => router.push("/add")}
              onCardLongPress={setQuickActionCard}
              onCardPress={handleCardPress}
              onFavoriteToggle={handleFavoriteToggle}
              resetSignal={reelResetSignal}
              onViewArchived={() =>
                router.push({
                  pathname: "/search",
                  params: { filter: "archived" },
                })
              }
            />
          </View>

          <BadgeBottomNav />
        </View>
      </SafeAreaView>

      <QuickActionsModal
        card={quickActionCard}
        canRemoveFromReel={Boolean(db && reelsState.selectedReelId)}
        onClose={closeQuickActions}
        onEdit={editQuickActionCard}
        onFavorite={favoriteQuickActionCard}
        onOpen={openQuickActionCard}
        onRemoveFromReel={() => {
          removeQuickActionCardFromReel().catch(() => undefined);
        }}
      />
    </View>
  );
}

type HeaderIconButtonProps = {
  icon: "search" | "settings";
  label: string;
  onPress: () => void;
};

function HeaderIconButton({ icon, label, onPress }: HeaderIconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.headerIconButton,
        pressed && styles.pressed,
      ]}
    >
      <BadgeIcon name={icon} color={badgeColors.text} size={19} />
    </Pressable>
  );
}

type HomeReelContentProps = {
  activeCards: BadgeCard[];
  archivedCards: BadgeCard[];
  hapticsEnabled: boolean;
  isLoading: boolean;
  reduceMotion: boolean;
  onAddCard: () => void;
  onCardLongPress: (card: BadgeCard) => void;
  onCardPress: (card: BadgeCard) => void;
  onFavoriteToggle: (card: BadgeCard) => void;
  resetSignal: number;
  onViewArchived: () => void;
};

function HomeReelContent({
  activeCards,
  archivedCards,
  hapticsEnabled,
  isLoading,
  reduceMotion,
  onAddCard,
  onCardLongPress,
  onCardPress,
  onFavoriteToggle,
  resetSignal,
  onViewArchived,
}: HomeReelContentProps) {
  if (activeCards.length === 0 && isLoading) {
    return (
      <StatePanel
        title="Loading cards..."
        text="Opening your local badge card library."
      />
    );
  }

  if (activeCards.length === 0 && archivedCards.length > 0) {
    return (
      <StatePanel
        title="No active cards"
        text="All cards in this reel are archived. Use Search to review or restore them."
        actionLabel="View archived"
        onAction={onViewArchived}
      />
    );
  }

  if (activeCards.length === 0) {
    return (
      <StatePanel
        title="No cards yet"
        text="Add your first badge reference card to start building the reel."
        actionLabel="Add card"
        onAction={onAddCard}
      />
    );
  }

  return (
    <BadgeReel
      cards={activeCards}
      hapticsEnabled={hapticsEnabled}
      reduceMotion={reduceMotion}
      onCardLongPress={onCardLongPress}
      onCardPress={onCardPress}
      onFavoriteToggle={onFavoriteToggle}
      resetSignal={resetSignal}
    />
  );
}

type StatePanelProps = {
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
};

function StatePanel({ title, text, actionLabel, onAction }: StatePanelProps) {
  return (
    <View style={styles.statePanel}>
      <Text style={styles.statePanelTitle}>{title}</Text>
      <Text style={styles.statePanelText}>{text}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [
            styles.statePanelButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.statePanelButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type InlineNoticeProps = {
  title: string;
  text: string;
};

function InlineNotice({ title, text }: InlineNoticeProps) {
  return (
    <View style={styles.inlineNotice}>
      <Text style={styles.inlineNoticeTitle}>{title}</Text>
      <Text style={styles.inlineNoticeText}>{text}</Text>
    </View>
  );
}

type QuickActionsModalProps = {
  card: BadgeCard | null;
  canRemoveFromReel: boolean;
  onClose: () => void;
  onFavorite: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onRemoveFromReel: () => void;
};

function QuickActionsModal({
  card,
  canRemoveFromReel,
  onClose,
  onFavorite,
  onOpen,
  onEdit,
  onRemoveFromReel,
}: QuickActionsModalProps) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={Boolean(card)}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          accessibilityRole="button"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        {card && (
          <View style={styles.quickSheet}>
            <Text style={styles.quickEyebrow}>Quick actions</Text>
            <Text style={styles.quickTitle}>{card.title}</Text>
            <ScrollView
              horizontal
              contentContainerStyle={styles.quickActionsRow}
              showsHorizontalScrollIndicator={false}
            >
              <ActionButton label="Open viewer" onPress={onOpen} />
              <ActionButton
                label={card.isFavorite ? "Remove favorite" : "Add favorite"}
                onPress={onFavorite}
              />
              <ActionButton label="Edit card" onPress={onEdit} />
              {canRemoveFromReel ? (
                <ActionButton
                  label="Remove from reel"
                  onPress={onRemoveFromReel}
                />
              ) : null}
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
}

type ActionButtonProps = {
  label: string;
  onPress: () => void;
};

function ActionButton({ label, onPress }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
      onPress={onPress}
    >
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: badgeColors.bg,
  },
  safeArea: {
    flex: 1,
  },
  homeShell: {
    flex: 1,
    width: "100%",
    alignSelf: "center",
    paddingBottom: 8,
  },
  appBar: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  titleCluster: {
    flex: 1,
    minWidth: 0,
  },
  appEyebrow: {
    color: badgeColors.primary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  appTitle: {
    color: badgeColors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  appMeta: {
    color: badgeColors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: badgeColors.border,
    backgroundColor: badgeColors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  reelWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "stretch",
    minHeight: 0,
    paddingTop: 4,
  },
  compactReelWrapper: {
    minHeight: 0,
  },
  inlineNotice: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#FBBF2466",
    backgroundColor: "#FBBF2417",
    padding: 12,
    gap: 4,
  },
  inlineNoticeTitle: {
    color: "#FDE68A",
    fontSize: 12,
    fontWeight: "900",
  },
  inlineNoticeText: {
    color: "#FDE68A",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
  },
  statePanel: {
    marginHorizontal: 22,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#26364F",
    backgroundColor: "#101C2EE6",
    padding: 18,
    alignItems: "center",
    gap: 9,
  },
  statePanelTitle: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  statePanelText: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    textAlign: "center",
  },
  statePanelButton: {
    marginTop: 6,
    borderRadius: 16,
    backgroundColor: "#2DD4BF",
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  statePanelButtonText: {
    color: "#04111F",
    fontSize: 13,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.78,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#020817CC",
    justifyContent: "flex-end",
  },
  quickSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#07111F",
    borderWidth: 1,
    borderColor: "#26364F",
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 28,
  },
  quickEyebrow: {
    color: "#2DD4BF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  quickTitle: {
    color: "#F8FAFC",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 5,
  },
  quickActionsRow: {
    gap: 10,
    paddingTop: 16,
  },
  actionButton: {
    borderRadius: 16,
    backgroundColor: "#17243A",
    borderWidth: 1,
    borderColor: "#26364F",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  actionButtonText: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "900",
  },
});
