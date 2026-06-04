import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  BadgeIconButton,
  badgeColors,
  useBadgeLayout,
} from "@/components/badge-ui";
import { useDatabaseContext } from "@/db/DatabaseProvider";
import { removeCardFromReel } from "@/db/repositories/reelsRepository";
import type { BadgeCard } from "@/features/cards/types";
import { useCards } from "@/features/cards/useCards";
import { ReelSelector } from "@/features/reels/ReelSelector";
import { useReels } from "@/features/reels/useReels";
import { SearchFilterBar } from "@/features/search/SearchFilterBar";
import { SearchResultsList } from "@/features/search/SearchResultsList";
import {
  useFilteredCards,
  type CardFilter,
} from "@/features/search/useFilteredCards";
import { useBooleanSetting } from "@/features/settings/useBooleanSetting";

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
  const [reduceMotion, setReduceMotion] = useBooleanSetting(
    "reduce_motion_enabled",
    false,
  );
  const [hapticsEnabled, setHapticsEnabled] = useBooleanSetting(
    "haptics_enabled",
    true,
  );
  const [quickActionCard, setQuickActionCard] = useState<BadgeCard | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [cardFilter, setCardFilter] = useState<CardFilter>({ type: "all" });

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const {
    activeCards,
    archivedCards,
    categories,
    filteredCards,
    isFiltering,
    tags,
  } = useFilteredCards({
    cards,
    filter: cardFilter,
    query: searchQuery,
  });

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

  const clearSearch = () => {
    setSearchQuery("");
    setCardFilter({ type: "all" });
  };

  const closeQuickActions = () => setQuickActionCard(null);
  const selectedReelLabel = reelsState.selectedReelId
    ? (reelsState.reels.find((reel) => reel.id === reelsState.selectedReelId)
        ?.name ?? "Reel")
    : "All cards";

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
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
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
            <View style={styles.appActions}>
              <BadgeIconButton
                accessibilityLabel="Open settings"
                icon="..."
                onPress={() => router.push("/settings")}
              />
              <BadgeIconButton
                accessibilityLabel="Add card"
                icon="+"
                onPress={() => router.push("/add")}
                variant="primary"
              />
            </View>
          </View>

          <View style={styles.controlsRow}>
            <ToggleButton
              label="3D"
              selected={!reduceMotion}
              onPress={() => setReduceMotion(false)}
            />
            <ToggleButton
              label="Calm"
              selected={reduceMotion}
              onPress={() => setReduceMotion(true)}
            />
            <ToggleButton
              label="Haptic"
              selected={hapticsEnabled}
              onPress={() => setHapticsEnabled((enabled) => !enabled)}
            />
          </View>

          <ReelSelector
            reels={reelsState.reels}
            selectedReelId={reelsState.selectedReelId}
            allActiveCardCount={reelsState.allActiveCardCount}
            isLoading={reelsState.isLoading}
            onSelectReel={(reelId) => {
              reelsState.selectReel(reelId).catch(() => undefined);
            }}
            onCreateReel={reelsState.createNewReel}
            onUpdateReel={reelsState.updateExistingReel}
            onArchiveReel={reelsState.archiveExistingReel}
            onDeleteReel={reelsState.deleteExistingReel}
            onMoveReel={reelsState.moveReel}
          />

          <SearchFilterBar
            query={searchQuery}
            filter={cardFilter}
            categories={categories}
            tags={tags}
            resultCount={filteredCards.length}
            totalCount={cards.length}
            onQueryChange={setSearchQuery}
            onFilterChange={setCardFilter}
          />

          {error ? (
            <InlineNotice
              title={isPersisted ? "Database warning" : "Demo fallback active"}
              text={
                isPersisted
                  ? error.message
                  : "Native SQLite is unavailable here, so BadgeDeck is showing demo cards. Use a development build for local storage."
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
              archivedCards={archivedCards}
              cards={cards}
              filteredCards={filteredCards}
              hapticsEnabled={hapticsEnabled}
              isFiltering={isFiltering}
              isLoading={isLoading}
              reduceMotion={reduceMotion}
              onAddCard={() => router.push("/add")}
              onCardLongPress={setQuickActionCard}
              onCardPress={handleCardPress}
              onClearSearch={clearSearch}
              onFavoriteToggle={handleFavoriteToggle}
              onViewArchived={() => setCardFilter({ type: "archived" })}
            />
          </View>
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

type HomeReelContentProps = {
  archivedCards: BadgeCard[];
  cards: BadgeCard[];
  filteredCards: BadgeCard[];
  hapticsEnabled: boolean;
  isFiltering: boolean;
  isLoading: boolean;
  reduceMotion: boolean;
  onAddCard: () => void;
  onCardLongPress: (card: BadgeCard) => void;
  onCardPress: (card: BadgeCard) => void;
  onClearSearch: () => void;
  onFavoriteToggle: (card: BadgeCard) => void;
  onViewArchived: () => void;
};

function HomeReelContent({
  archivedCards,
  cards,
  filteredCards,
  hapticsEnabled,
  isFiltering,
  isLoading,
  reduceMotion,
  onAddCard,
  onCardLongPress,
  onCardPress,
  onClearSearch,
  onFavoriteToggle,
  onViewArchived,
}: HomeReelContentProps) {
  if (cards.length === 0 && isLoading) {
    return (
      <StatePanel
        title="Loading cards…"
        text="Opening your local badge card library."
      />
    );
  }

  if (cards.length === 0) {
    return (
      <StatePanel
        title="No cards yet"
        text="Add your first badge reference card to start building the reel."
        actionLabel="Add card"
        onAction={onAddCard}
      />
    );
  }

  if (filteredCards.length === 0 && !isFiltering && archivedCards.length > 0) {
    return (
      <StatePanel
        title="No active cards"
        text="All cards are archived. Use the Archived filter to review or restore them."
        actionLabel="View archived"
        onAction={onViewArchived}
      />
    );
  }

  if (filteredCards.length === 0) {
    return (
      <StatePanel
        title="No matching cards"
        text="Try another search term or clear the active filter."
        actionLabel="Clear search"
        onAction={onClearSearch}
      />
    );
  }

  if (isFiltering) {
    return (
      <SearchResultsList
        cards={filteredCards}
        onCardLongPress={onCardLongPress}
        onCardPress={onCardPress}
        onFavoriteToggle={onFavoriteToggle}
      />
    );
  }

  return (
    <BadgeReel
      cards={filteredCards}
      hapticsEnabled={hapticsEnabled}
      reduceMotion={reduceMotion}
      onCardLongPress={onCardLongPress}
      onCardPress={onCardPress}
      onFavoriteToggle={onFavoriteToggle}
    />
  );
}

type ToggleButtonProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function ToggleButton({ label, selected, onPress }: ToggleButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.toggleButton,
        selected && styles.toggleButtonSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.toggleButtonText,
          selected && styles.toggleButtonTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
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
    paddingBottom: 12,
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
  appActions: {
    flexDirection: "row",
    gap: 10,
  },
  controlsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    flexWrap: "wrap",
  },
  toggleButton: {
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
    backgroundColor: "#101C2E",
    borderWidth: 1,
    borderColor: "#26364F",
  },
  toggleButtonSelected: {
    backgroundColor: "#2DD4BF22",
    borderColor: "#2DD4BF99",
  },
  toggleButtonText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800",
  },
  toggleButtonTextSelected: {
    color: "#F8FAFC",
  },
  reelWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "stretch",
    minHeight: 360,
    paddingTop: 4,
  },
  compactReelWrapper: {
    minHeight: 300,
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
