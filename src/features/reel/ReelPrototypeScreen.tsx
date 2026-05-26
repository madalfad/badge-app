import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset } from '@/constants/theme';

import { BadgeReel } from './BadgeReel';
import { BadgeReelCard } from './BadgeReelCard';
import { mockBadgeCards, type MockBadgeCard } from './mockCards';

export function ReelPrototypeScreen() {
  const [cards, setCards] = useState(mockBadgeCards);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [selectedCard, setSelectedCard] = useState<MockBadgeCard | null>(null);
  const [quickActionCard, setQuickActionCard] = useState<MockBadgeCard | null>(null);

  const favoriteCount = useMemo(() => cards.filter((card) => card.isFavorite).length, [cards]);

  const toggleFavorite = (cardToToggle: MockBadgeCard) => {
    setCards((currentCards) =>
      currentCards.map((card) =>
        card.id === cardToToggle.id ? { ...card, isFavorite: !card.isFavorite } : card
      )
    );
    if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Milestone 1 prototype</Text>
            <Text style={styles.title}>BadgeDeck</Text>
            <Text style={styles.subtitle}>A tactile 3D reel for badge reference cards.</Text>
          </View>
          <View style={styles.statsPill}>
            <Text style={styles.statsNumber}>{cards.length}</Text>
            <Text style={styles.statsLabel}>cards</Text>
          </View>
        </View>

        <View style={styles.controlsRow}>
          <ToggleButton label="3D reel" selected={!reduceMotion} onPress={() => setReduceMotion(false)} />
          <ToggleButton label="Reduced motion" selected={reduceMotion} onPress={() => setReduceMotion(true)} />
          <ToggleButton
            label="Haptics"
            selected={hapticsEnabled}
            onPress={() => setHapticsEnabled((enabled) => !enabled)}
          />
        </View>

        <View style={styles.reelWrapper}>
          <BadgeReel
            cards={cards}
            hapticsEnabled={hapticsEnabled}
            reduceMotion={reduceMotion}
            onCardLongPress={setQuickActionCard}
            onCardPress={setSelectedCard}
            onFavoriteToggle={toggleFavorite}
          />
        </View>

        <View style={styles.footerPanel}>
          <Text style={styles.footerTitle}>Interaction test</Text>
          <Text style={styles.footerText}>
            Swipe vertically to spin the reel. Tap the focused card to preview. Double tap any card to
            favorite. Long press for quick actions.
          </Text>
          <View style={styles.footerStatsRow}>
            <Text style={styles.footerStat}>{favoriteCount} favorites</Text>
            <Text style={styles.footerStat}>Mock data only</Text>
          </View>
        </View>
      </SafeAreaView>

      <CardPreviewModal
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
        onFavorite={() => {
          if (selectedCard) {
            toggleFavorite(selectedCard);
            setSelectedCard((current) => (current ? { ...current, isFavorite: !current.isFavorite } : current));
          }
        }}
      />

      <QuickActionsModal
        card={quickActionCard}
        onClose={() => setQuickActionCard(null)}
        onFavorite={() => {
          if (quickActionCard) {
            toggleFavorite(quickActionCard);
            setQuickActionCard(null);
          }
        }}
        onOpen={() => {
          if (quickActionCard) {
            setSelectedCard(quickActionCard);
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
      style={({ pressed }) => [styles.toggleButton, selected && styles.toggleButtonSelected, pressed && styles.pressed]}>
      <Text style={[styles.toggleButtonText, selected && styles.toggleButtonTextSelected]}>{label}</Text>
    </Pressable>
  );
}

type CardPreviewModalProps = {
  card: MockBadgeCard | null;
  onClose: () => void;
  onFavorite: () => void;
};

function CardPreviewModal({ card, onClose, onFavorite }: CardPreviewModalProps) {
  return (
    <Modal animationType="fade" transparent visible={Boolean(card)} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable accessibilityRole="button" style={StyleSheet.absoluteFill} onPress={onClose} />
        {card && (
          <View style={styles.previewSheet}>
            <View style={styles.previewHandle} />
            <BadgeReelCard
              card={card}
              focused
              height={430}
              width={300}
              onDoublePress={onFavorite}
              onLongPress={onFavorite}
              onPress={onFavorite}
            />
            <Text style={styles.previewTitle}>{card.title}</Text>
            <Text style={styles.previewText}>
              This is the Milestone 1 mock detail view. The real viewer will add pinch-zoom,
              front/back switching, and high-contrast reading mode.
            </Text>
            <View style={styles.modalActionsRow}>
              <Pressable style={styles.secondaryAction} onPress={onClose}>
                <Text style={styles.secondaryActionText}>Close</Text>
              </Pressable>
              <Pressable style={[styles.primaryAction, { backgroundColor: card.accentColor }]} onPress={onFavorite}>
                <Text style={styles.primaryActionText}>{card.isFavorite ? 'Unfavorite' : 'Favorite'}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

type QuickActionsModalProps = {
  card: MockBadgeCard | null;
  onClose: () => void;
  onFavorite: () => void;
  onOpen: () => void;
};

function QuickActionsModal({ card, onClose, onFavorite, onOpen }: QuickActionsModalProps) {
  return (
    <Modal animationType="fade" transparent visible={Boolean(card)} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable accessibilityRole="button" style={StyleSheet.absoluteFill} onPress={onClose} />
        {card && (
          <View style={styles.quickSheet}>
            <Text style={styles.quickEyebrow}>Quick actions</Text>
            <Text style={styles.quickTitle}>{card.title}</Text>
            <ScrollView horizontal contentContainerStyle={styles.quickActionsRow} showsHorizontalScrollIndicator={false}>
              <ActionButton label="Open preview" onPress={onOpen} />
              <ActionButton label={card.isFavorite ? 'Remove favorite' : 'Add favorite'} onPress={onFavorite} />
              <ActionButton label="Mock edit" onPress={onClose} />
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
    <Pressable style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]} onPress={onPress}>
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#07111F',
  },
  safeArea: {
    flex: 1,
    paddingBottom: BottomTabInset + 18,
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  eyebrow: {
    color: '#2DD4BF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1.2,
    marginTop: 4,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 260,
    marginTop: 4,
    fontWeight: '600',
  },
  statsPill: {
    minWidth: 70,
    borderRadius: 22,
    backgroundColor: '#101C2E',
    borderWidth: 1,
    borderColor: '#26364F',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statsNumber: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
  },
  statsLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 22,
    paddingTop: 18,
    flexWrap: 'wrap',
  },
  toggleButton: {
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
    backgroundColor: '#101C2E',
    borderWidth: 1,
    borderColor: '#26364F',
  },
  toggleButtonSelected: {
    backgroundColor: '#2DD4BF22',
    borderColor: '#2DD4BF99',
  },
  toggleButtonText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
  },
  toggleButtonTextSelected: {
    color: '#F8FAFC',
  },
  reelWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
    marginTop: 2,
  },
  footerPanel: {
    marginHorizontal: 22,
    borderRadius: 24,
    backgroundColor: '#101C2EE6',
    borderWidth: 1,
    borderColor: '#26364F',
    padding: 16,
  },
  footerTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '900',
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
    fontWeight: '600',
  },
  footerStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  footerStat: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#17243A',
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pressed: {
    opacity: 0.78,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#020817CC',
    justifyContent: 'flex-end',
  },
  previewSheet: {
    alignItems: 'center',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: '#07111F',
    borderWidth: 1,
    borderColor: '#26364F',
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 28,
  },
  previewHandle: {
    width: 46,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#334155',
    marginBottom: 18,
  },
  previewTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 18,
  },
  previewText: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    alignSelf: 'stretch',
  },
  primaryAction: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 14,
  },
  primaryActionText: {
    color: '#08111F',
    fontSize: 14,
    fontWeight: '900',
  },
  secondaryAction: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#17243A',
  },
  secondaryActionText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '900',
  },
  quickSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#07111F',
    borderWidth: 1,
    borderColor: '#26364F',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 28,
  },
  quickEyebrow: {
    color: '#2DD4BF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  quickTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 5,
  },
  quickActionsRow: {
    gap: 10,
    paddingTop: 16,
  },
  actionButton: {
    borderRadius: 16,
    backgroundColor: '#17243A',
    borderWidth: 1,
    borderColor: '#26364F',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  actionButtonText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '900',
  },
});
