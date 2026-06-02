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

import type { BadgeCard } from "@/features/cards/types";
import { useCards } from "@/features/cards/useCards";
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
  const {
    cards,
    error,
    isLoading,
    isPersisted,
    markCardViewed,
    reload,
    toggleFavorite,
  } = useCards();
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

  const favoriteCount = useMemo(
    () => cards.filter((card) => card.isFavorite).length,
    [cards],
  );
  const { categories, filteredCards, isFiltering, tags } = useFilteredCards({
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

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Offline reference library</Text>
            <Text style={styles.title}>BadgeDeck</Text>
            <Text style={styles.subtitle}>
              A tactile 3D reel for badge reference cards.
            </Text>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.topButtonRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/settings")}
                style={({ pressed }) => [
                  styles.settingsButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.settingsButtonText}>Settings</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/add")}
                style={({ pressed }) => [
                  styles.addButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.addButtonText}>+ Add</Text>
              </Pressable>
            </View>
            <View style={styles.statsPill}>
              <Text style={styles.statsNumber}>{cards.length}</Text>
              <Text style={styles.statsLabel}>cards</Text>
            </View>
          </View>
        </View>

        <View style={styles.controlsRow}>
          <ToggleButton
            label="3D reel"
            selected={!reduceMotion}
            onPress={() => setReduceMotion(false)}
          />
          <ToggleButton
            label="Reduced motion"
            selected={reduceMotion}
            onPress={() => setReduceMotion(true)}
          />
          <ToggleButton
            label="Haptics"
            selected={hapticsEnabled}
            onPress={() => setHapticsEnabled((enabled) => !enabled)}
          />
        </View>

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

        <View style={styles.reelWrapper}>
          {cards.length === 0 && isLoading ? (
            <StatePanel
              title="Loading cards…"
              text="Opening your local badge card library."
            />
          ) : cards.length === 0 ? (
            <StatePanel
              title="No cards yet"
              text="Add your first badge reference card to start building the reel."
              actionLabel="Add card"
              onAction={() => router.push("/add")}
            />
          ) : filteredCards.length === 0 ? (
            <StatePanel
              title="No matching cards"
              text="Try another search term or clear the active filter."
              actionLabel="Clear search"
              onAction={() => {
                setSearchQuery("");
                setCardFilter({ type: "all" });
              }}
            />
          ) : isFiltering ? (
            <SearchResultsList
              cards={filteredCards}
              onCardLongPress={setQuickActionCard}
              onCardPress={handleCardPress}
              onFavoriteToggle={handleFavoriteToggle}
            />
          ) : (
            <BadgeReel
              cards={cards}
              hapticsEnabled={hapticsEnabled}
              reduceMotion={reduceMotion}
              onCardLongPress={setQuickActionCard}
              onCardPress={handleCardPress}
              onFavoriteToggle={handleFavoriteToggle}
            />
          )}
        </View>

        <View style={styles.footerPanel}>
          <Text style={styles.footerTitle}>Badge reel</Text>
          <Text style={styles.footerText}>
            Swipe vertically to spin the reel. Tap the focused card to open the
            zoomable viewer. Double tap any card to favorite. Long press for
            quick actions.
          </Text>
          <View style={styles.footerStatsRow}>
            <Text style={styles.footerStat}>{favoriteCount} favorites</Text>
            <Text style={styles.footerStat}>
              {isPersisted ? "SQLite backed" : "Demo fallback"}
            </Text>
            {isLoading && (
              <Text style={styles.footerStat}>Loading database…</Text>
            )}
            {isFiltering && (
              <Text style={styles.footerStat}>
                {filteredCards.length} shown
              </Text>
            )}
            {error && <Text style={styles.footerStat}>Fallback active</Text>}
          </View>
        </View>
      </SafeAreaView>

      <QuickActionsModal
        card={quickActionCard}
        onClose={() => setQuickActionCard(null)}
        onFavorite={() => {
          if (quickActionCard) {
            handleFavoriteToggle(quickActionCard);
            setQuickActionCard(null);
          }
        }}
        onOpen={() => {
          if (quickActionCard) {
            handleCardPress(quickActionCard);
            setQuickActionCard(null);
          }
        }}
        onEdit={() => {
          if (quickActionCard) {
            router.push({
              pathname: "/card/[id]/edit",
              params: { id: quickActionCard.id },
            });
            setQuickActionCard(null);
          }
        }}
      />
    </View>
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
  onClose: () => void;
  onFavorite: () => void;
  onOpen: () => void;
  onEdit: () => void;
};

function QuickActionsModal({
  card,
  onClose,
  onFavorite,
  onOpen,
  onEdit,
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
    backgroundColor: "#07111F",
  },
  safeArea: {
    flex: 1,
    paddingBottom: 18,
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  eyebrow: {
    color: "#2DD4BF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -1.2,
    marginTop: 4,
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 260,
    marginTop: 4,
    fontWeight: "600",
  },
  headerActions: {
    alignItems: "flex-end",
    gap: 10,
  },
  topButtonRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  settingsButton: {
    borderRadius: 999,
    backgroundColor: "#17243A",
    borderWidth: 1,
    borderColor: "#26364F",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  settingsButtonText: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "900",
  },
  addButton: {
    borderRadius: 999,
    backgroundColor: "#2DD4BF",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addButtonText: {
    color: "#04111F",
    fontSize: 13,
    fontWeight: "900",
  },
  statsPill: {
    minWidth: 70,
    borderRadius: 22,
    backgroundColor: "#101C2E",
    borderWidth: 1,
    borderColor: "#26364F",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statsNumber: {
    color: "#F8FAFC",
    fontSize: 22,
    fontWeight: "900",
  },
  statsLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  controlsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 22,
    paddingTop: 18,
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
    marginTop: 2,
  },
  inlineNotice: {
    marginHorizontal: 22,
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
  footerPanel: {
    marginHorizontal: 22,
    borderRadius: 24,
    backgroundColor: "#101C2EE6",
    borderWidth: 1,
    borderColor: "#26364F",
    padding: 16,
  },
  footerTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "900",
  },
  footerText: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
    fontWeight: "600",
  },
  footerStatsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
  },
  footerStat: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#17243A",
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 6,
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
