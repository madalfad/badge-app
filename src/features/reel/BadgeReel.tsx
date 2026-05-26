import * as Haptics from "expo-haptics";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";

import { BadgeReelCard } from "./BadgeReelCard";
import type { MockBadgeCard } from "./mockCards";
import { ReelClip } from "./ReelClip";
import {
  VISIBLE_CARD_RADIUS,
  getProjectedIndex,
  isCardInRenderWindow,
  springConfig,
} from "./reelMath";

type BadgeReelProps = {
  cards: MockBadgeCard[];
  initialCardId?: string;
  reduceMotion: boolean;
  hapticsEnabled: boolean;
  onCardPress: (card: MockBadgeCard) => void;
  onCardLongPress: (card: MockBadgeCard) => void;
  onFavoriteToggle: (card: MockBadgeCard) => void;
};

type AnimatedReelItemProps = {
  card: MockBadgeCard;
  index: number;
  progress: SharedValue<number>;
  cardWidth: number;
  cardHeight: number;
  itemSpacing: number;
  stageHeight: number;
  stageWidth: number;
  focused: boolean;
  onPress: () => void;
  onDoublePress: () => void;
  onLongPress: () => void;
};

function triggerSelectionHaptic() {
  Haptics.selectionAsync().catch(() => undefined);
}

function triggerLongPressHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
    () => undefined,
  );
}

function AnimatedReelItem({
  card,
  index,
  progress,
  cardWidth,
  cardHeight,
  itemSpacing,
  stageHeight,
  stageWidth,
  focused,
  onPress,
  onDoublePress,
  onLongPress,
}: AnimatedReelItemProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const distance = index - progress.value;
    const absDistance = Math.abs(distance);
    const translateY = distance * itemSpacing;
    const scale = interpolate(
      absDistance,
      [0, 1, 2, 3],
      [1, 0.91, 0.84, 0.76],
      Extrapolation.CLAMP,
    );
    const rotateX = interpolate(
      distance,
      [-3, -1, 0, 1, 3],
      [48, 18, 0, -18, -48],
      Extrapolation.CLAMP,
    );
    const rotateZ = interpolate(
      distance,
      [-3, 0, 3],
      [-4, 0, 4],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      absDistance,
      [0, 1, 2.25, 3],
      [1, 0.86, 0.5, 0.18],
      Extrapolation.CLAMP,
    );
    const translateX = interpolate(
      distance,
      [-3, 0, 3],
      [-14, 0, 14],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      zIndex: Math.round((VISIBLE_CARD_RADIUS + 1 - absDistance) * 10),
      transform: [
        { perspective: 1050 },
        { translateY },
        { translateX },
        { rotateX: `${rotateX}deg` },
        { rotateZ: `${rotateZ}deg` },
        { scale },
      ],
    };
  }, [cardHeight, cardWidth, index, itemSpacing, progress]);

  return (
    <Animated.View
      pointerEvents={focused ? "auto" : "box-none"}
      style={[
        styles.animatedItem,
        {
          top: (stageHeight - cardHeight) / 2,
          left: (stageWidth - cardWidth) / 2,
        },
        animatedStyle,
      ]}
    >
      <BadgeReelCard
        card={card}
        focused={focused}
        height={cardHeight}
        width={cardWidth}
        onDoublePress={onDoublePress}
        onLongPress={onLongPress}
        onPress={onPress}
      />
    </Animated.View>
  );
}

export function BadgeReel({
  cards,
  initialCardId,
  reduceMotion,
  hapticsEnabled,
  onCardPress,
  onCardLongPress,
  onFavoriteToggle,
}: BadgeReelProps) {
  const { width, height } = useWindowDimensions();
  const initialIndex = Math.max(
    cards.findIndex((card) => card.id === initialCardId),
    0,
  );
  const progress = useSharedValue(initialIndex);
  const panStartProgress = useSharedValue(initialIndex);
  const activeIndexRef = useRef(initialIndex);
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const dimensions = useMemo(() => {
    const cardWidth = Math.min(width - 54, 350);
    const cardHeight = Math.min(cardWidth * 1.45, height * 0.57);
    const stageHeight = Math.min(
      Math.max(cardHeight + 190, 520),
      height * 0.74,
    );
    return {
      cardWidth,
      cardHeight,
      itemSpacing: cardHeight * 0.39,
      stageWidth: width,
      stageHeight,
    };
  }, [height, width]);

  const handleActiveIndexChange = useCallback(
    (nextIndex: number) => {
      if (nextIndex === activeIndexRef.current) {
        return;
      }
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
      if (hapticsEnabled) {
        triggerSelectionHaptic();
      }
    },
    [hapticsEnabled],
  );

  useAnimatedReaction(
    () =>
      Math.min(
        Math.max(Math.round(progress.value), 0),
        Math.max(cards.length - 1, 0),
      ),
    (nextIndex, previousIndex) => {
      if (nextIndex !== previousIndex) {
        runOnJS(handleActiveIndexChange)(nextIndex);
      }
    },
    [cards.length, handleActiveIndexChange],
  );

  const snapToIndex = useCallback(
    (index: number) => {
      progress.value = withSpring(index, springConfig);
    },
    [progress],
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          panStartProgress.value = progress.value;
        })
        .onUpdate((event) => {
          const nextProgress =
            panStartProgress.value -
            event.translationY / dimensions.itemSpacing;
          progress.value = Math.min(
            Math.max(nextProgress, 0),
            Math.max(cards.length - 1, 0),
          );
        })
        .onEnd((event) => {
          const nextIndex = getProjectedIndex(
            progress.value,
            event.velocityY,
            dimensions.itemSpacing,
            cards.length,
          );
          progress.value = withSpring(nextIndex, springConfig);
        }),
    [cards.length, dimensions.itemSpacing, panStartProgress, progress],
  );

  const visibleCards = useMemo(
    () =>
      cards
        .map((card, index) => ({ card, index }))
        .filter(({ index }) => isCardInRenderWindow(index, activeIndex)),
    [activeIndex, cards],
  );

  const handleLongPress = useCallback(
    (card: MockBadgeCard) => {
      if (hapticsEnabled) {
        triggerLongPressHaptic();
      }
      onCardLongPress(card);
    },
    [hapticsEnabled, onCardLongPress],
  );

  if (reduceMotion) {
    return (
      <ScrollView
        accessibilityLabel="Reduced motion badge card list"
        contentContainerStyle={styles.reducedMotionList}
        showsVerticalScrollIndicator={false}
      >
        {cards.map((card) => (
          <BadgeReelCard
            key={card.id}
            card={card}
            focused
            height={dimensions.cardHeight * 0.86}
            width={dimensions.cardWidth}
            onDoublePress={() => onFavoriteToggle(card)}
            onLongPress={() => handleLongPress(card)}
            onPress={() => onCardPress(card)}
          />
        ))}
      </ScrollView>
    );
  }

  return (
    <View
      style={[
        styles.stage,
        { height: dimensions.stageHeight, width: dimensions.stageWidth },
      ]}
    >
      <ReelClip />
      <GestureDetector gesture={panGesture}>
        <View style={styles.gestureSurface}>
          {visibleCards.map(({ card, index }) => {
            const focused = activeIndex === index;
            return (
              <AnimatedReelItem
                key={card.id}
                card={card}
                cardHeight={dimensions.cardHeight}
                cardWidth={dimensions.cardWidth}
                focused={focused}
                index={index}
                itemSpacing={dimensions.itemSpacing}
                progress={progress}
                stageHeight={dimensions.stageHeight}
                stageWidth={dimensions.stageWidth}
                onDoublePress={() => onFavoriteToggle(card)}
                onLongPress={() => handleLongPress(card)}
                onPress={() => {
                  if (activeIndexRef.current === index) {
                    onCardPress(card);
                    return;
                  }
                  snapToIndex(index);
                }}
              />
            );
          })}
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    overflow: "visible",
    alignSelf: "stretch",
  },
  gestureSurface: {
    flex: 1,
    overflow: "visible",
  },
  animatedItem: {
    position: "absolute",
  },
  reducedMotionList: {
    gap: 18,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 34,
    alignItems: "center",
  },
});
