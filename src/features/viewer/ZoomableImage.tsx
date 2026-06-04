import { Image } from "expo-image";
import { useEffect } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

function clamp(value: number, min: number, max: number) {
  "worklet";
  return Math.min(Math.max(value, min), max);
}

function getContainedSize(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number,
) {
  "worklet";

  if (
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    imageWidth <= 0 ||
    imageHeight <= 0
  ) {
    return { width: containerWidth, height: containerHeight };
  }

  const imageAspectRatio = imageWidth / imageHeight;
  const containerAspectRatio = containerWidth / containerHeight;

  if (imageAspectRatio >= containerAspectRatio) {
    return {
      width: containerWidth,
      height: containerWidth / imageAspectRatio,
    };
  }

  return {
    width: containerHeight * imageAspectRatio,
    height: containerHeight,
  };
}

function getMaxTranslateBounds(
  scale: number,
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number,
) {
  "worklet";
  const containedSize = getContainedSize(
    containerWidth,
    containerHeight,
    imageWidth,
    imageHeight,
  );

  return {
    x: Math.max(0, (containedSize.width * scale - containerWidth) / 2),
    y: Math.max(0, (containedSize.height * scale - containerHeight) / 2),
  };
}

type ZoomableImageProps = {
  uri: string;
  placeholderUri?: string | null;
  onSingleTap: () => void;
  highContrast: boolean;
  imageWidth?: number | null;
  imageHeight?: number | null;
};

export function ZoomableImage({
  uri,
  placeholderUri,
  onSingleTap,
  highContrast,
  imageWidth,
  imageHeight,
}: ZoomableImageProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const containerWidth = useSharedValue(0);
  const containerHeight = useSharedValue(0);
  const naturalImageWidth = useSharedValue(imageWidth ?? 0);
  const naturalImageHeight = useSharedValue(imageHeight ?? 0);

  useEffect(() => {
    naturalImageWidth.value = imageWidth ?? 0;
    naturalImageHeight.value = imageHeight ?? 0;
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [
    imageHeight,
    imageWidth,
    naturalImageHeight,
    naturalImageWidth,
    savedScale,
    savedTranslateX,
    savedTranslateY,
    scale,
    translateX,
    translateY,
    uri,
  ]);

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    containerWidth.value = event.nativeEvent.layout.width;
    containerHeight.value = event.nativeEvent.layout.height;
  };

  const resetTransform = () => {
    "worklet";
    scale.value = withTiming(1);
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const resetTranslation = () => {
    "worklet";
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      const nextScale = clamp(
        savedScale.value * event.scale,
        MIN_SCALE,
        MAX_SCALE,
      );
      const bounds = getMaxTranslateBounds(
        nextScale,
        containerWidth.value,
        containerHeight.value,
        naturalImageWidth.value,
        naturalImageHeight.value,
      );

      scale.value = nextScale;
      translateX.value = clamp(translateX.value, -bounds.x, bounds.x);
      translateY.value = clamp(translateY.value, -bounds.y, bounds.y);
    })
    .onEnd(() => {
      if (scale.value <= 1.03) {
        resetTransform();
        return;
      }

      const bounds = getMaxTranslateBounds(
        scale.value,
        containerWidth.value,
        containerHeight.value,
        naturalImageWidth.value,
        naturalImageHeight.value,
      );
      const nextX = clamp(translateX.value, -bounds.x, bounds.x);
      const nextY = clamp(translateY.value, -bounds.y, bounds.y);

      translateX.value = withTiming(nextX);
      translateY.value = withTiming(nextY);
      savedTranslateX.value = nextX;
      savedTranslateY.value = nextY;
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      const bounds = getMaxTranslateBounds(
        scale.value,
        containerWidth.value,
        containerHeight.value,
        naturalImageWidth.value,
        naturalImageHeight.value,
      );

      translateX.value = clamp(
        savedTranslateX.value + event.translationX,
        -bounds.x,
        bounds.x,
      );
      translateY.value = clamp(
        savedTranslateY.value + event.translationY,
        -bounds.y,
        bounds.y,
      );
    })
    .onEnd(() => {
      if (scale.value <= 1.03) {
        resetTranslation();
        return;
      }

      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.05) {
        resetTransform();
        return;
      }

      scale.value = withTiming(2.35);
      savedScale.value = 2.35;
    });

  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(250)
    .onEnd(() => {
      runOnJS(onSingleTap)();
    });

  const gesture = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    Gesture.Exclusive(doubleTapGesture, singleTapGesture),
  );

  const animatedImageStyle = useAnimatedStyle(() => {
    const containedSize = getContainedSize(
      containerWidth.value,
      containerHeight.value,
      naturalImageWidth.value,
      naturalImageHeight.value,
    );

    return {
      width: containedSize.width,
      height: containedSize.height,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <View
        onLayout={handleContainerLayout}
        style={[styles.container, highContrast && styles.highContrastContainer]}
      >
        <Animated.View style={[styles.imageWrap, animatedImageStyle]}>
          <Image
            source={{ uri }}
            placeholder={placeholderUri ? { uri: placeholderUri } : undefined}
            contentFit="contain"
            recyclingKey={uri}
            style={styles.image}
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#07111F",
    alignItems: "center",
    justifyContent: "center",
  },
  highContrastContainer: {
    backgroundColor: "#000000",
  },
  imageWrap: {
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
