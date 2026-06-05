import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Line, Polygon } from "react-native-svg";

import { BadgeIcon } from "@/components/BadgeIcon";
import {
  alpha,
  badgeColors,
  useBadgeLayout,
} from "@/components/badge-ui";
import {
  clampCropCorners,
  createPerspectiveCropData,
  dimensionsAfterRotation,
  getFullFrameCorners,
  normalizeRotation,
  parsePerspectiveCropData,
  type CropCorners,
  type CropPoint,
  type CropPreset,
  type PerspectiveCropData,
} from "@/storage/cropGeometry";
import type { SourceCardImage } from "@/storage/imagePipeline";

export type EditableCropImage = SourceCardImage & {
  previewUri: string;
  cropDataJson?: string | null;
};

type PerspectiveCropEditorModalProps = {
  image: EditableCropImage | null;
  sideLabel: string;
  visible: boolean;
  onApply: (image: EditableCropImage) => void;
  onCancel: () => void;
};

type FrameSize = {
  width: number;
  height: number;
};

type ContainRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DragTarget = keyof CropCorners | "top" | "right" | "bottom" | "left";

type DragSession = {
  rect: ContainRect;
  startCorners: CropCorners;
  startX: number;
  startY: number;
  target: DragTarget;
};

function getInitialCropData(image: EditableCropImage): PerspectiveCropData {
  return (
    image.cropData ??
    parsePerspectiveCropData(image.cropDataJson) ??
    createPerspectiveCropData({
      width: image.width,
      height: image.height,
      rotation: image.rotateDegrees,
      preset: image.cropPreset ?? "free",
    })
  );
}

function getContainRect(
  frame: FrameSize,
  imageWidth: number,
  imageHeight: number,
): ContainRect {
  if (
    frame.width <= 0 ||
    frame.height <= 0 ||
    imageWidth <= 0 ||
    imageHeight <= 0
  ) {
    return { x: 0, y: 0, width: frame.width, height: frame.height };
  }

  const imageAspectRatio = imageWidth / imageHeight;
  const frameAspectRatio = frame.width / frame.height;

  if (imageAspectRatio >= frameAspectRatio) {
    const height = frame.width / imageAspectRatio;
    return {
      x: 0,
      y: (frame.height - height) / 2,
      width: frame.width,
      height,
    };
  }

  const width = frame.height * imageAspectRatio;
  return {
    x: (frame.width - width) / 2,
    y: 0,
    width,
    height: frame.height,
  };
}

function pointToFrame(point: CropPoint, rect: ContainRect) {
  return {
    x: rect.x + point.x * rect.width,
    y: rect.y + point.y * rect.height,
  };
}

function midpoint(a: CropPoint, b: CropPoint): CropPoint {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function moveTarget(
  start: CropCorners,
  target: DragTarget,
  deltaX: number,
  deltaY: number,
) {
  const next: CropCorners = {
    tl: { ...start.tl },
    tr: { ...start.tr },
    br: { ...start.br },
    bl: { ...start.bl },
  };

  const movePoint = (key: keyof CropCorners, x = deltaX, y = deltaY) => {
    next[key] = {
      x: start[key].x + x,
      y: start[key].y + y,
    };
  };

  if (target === "top") {
    movePoint("tl", 0, deltaY);
    movePoint("tr", 0, deltaY);
  } else if (target === "right") {
    movePoint("tr", deltaX, 0);
    movePoint("br", deltaX, 0);
  } else if (target === "bottom") {
    movePoint("br", 0, deltaY);
    movePoint("bl", 0, deltaY);
  } else if (target === "left") {
    movePoint("tl", deltaX, 0);
    movePoint("bl", deltaX, 0);
  } else {
    movePoint(target);
  }

  return clampCropCorners(next);
}

function getHandlePoints(corners: CropCorners) {
  return {
    tl: corners.tl,
    tr: corners.tr,
    br: corners.br,
    bl: corners.bl,
    top: midpoint(corners.tl, corners.tr),
    right: midpoint(corners.tr, corners.br),
    bottom: midpoint(corners.bl, corners.br),
    left: midpoint(corners.tl, corners.bl),
  };
}

export function PerspectiveCropEditorModal({
  image,
  sideLabel,
  visible,
  onApply,
  onCancel,
}: PerspectiveCropEditorModalProps) {
  const layout = useBadgeLayout();
  const [frame, setFrame] = useState<FrameSize>({ width: 0, height: 0 });
  const [corners, setCorners] = useState<CropCorners>(getFullFrameCorners);
  const [rotation, setRotation] = useState(0);
  const [preset, setPreset] = useState<CropPreset>("free");
  const cornersRef = useRef<CropCorners>(corners);
  const dragSession = useRef<DragSession | null>(null);

  useEffect(() => {
    if (!visible || !image) {
      return;
    }

    const cropData = getInitialCropData(image);
    cornersRef.current = cropData.corners;
    setCorners(cropData.corners);
    setRotation(cropData.rotation);
    setPreset(cropData.preset ?? "free");
  }, [image, visible]);

  const rotatedDimensions = useMemo(
    () =>
      image
        ? dimensionsAfterRotation(image.width, image.height, rotation)
        : { width: 1, height: 1 },
    [image, rotation],
  );
  const imageRect = useMemo(
    () =>
      getContainRect(
        frame,
        rotatedDimensions.width,
        rotatedDimensions.height,
      ),
    [frame, rotatedDimensions.height, rotatedDimensions.width],
  );
  const imageRectRef = useRef<ContainRect>(imageRect);

  useEffect(() => {
    cornersRef.current = corners;
  }, [corners]);

  useEffect(() => {
    imageRectRef.current = imageRect;
  }, [imageRect]);

  const framePoints = useMemo(
    () => ({
      tl: pointToFrame(corners.tl, imageRect),
      tr: pointToFrame(corners.tr, imageRect),
      br: pointToFrame(corners.br, imageRect),
      bl: pointToFrame(corners.bl, imageRect),
    }),
    [corners, imageRect],
  );
  const polygonPoints = `${framePoints.tl.x},${framePoints.tl.y} ${framePoints.tr.x},${framePoints.tr.y} ${framePoints.br.x},${framePoints.br.y} ${framePoints.bl.x},${framePoints.bl.y}`;
  const handlePoints = getHandlePoints(corners);

  const beginDrag = useCallback((target: DragTarget, x: number, y: number) => {
    dragSession.current = {
      rect: imageRectRef.current,
      startCorners: cornersRef.current,
      startX: x,
      startY: y,
      target,
    };
  }, []);

  const updateDrag = useCallback((x: number, y: number) => {
    const session = dragSession.current;

    if (
      !session ||
      session.rect.width <= 0 ||
      session.rect.height <= 0
    ) {
      return;
    }

    const nextCorners = moveTarget(
      session.startCorners,
      session.target,
      (x - session.startX) / session.rect.width,
      (y - session.startY) / session.rect.height,
    );
    cornersRef.current = nextCorners;
    setPreset((currentPreset) =>
      currentPreset === "free" ? currentPreset : "free",
    );
    setCorners(nextCorners);
  }, []);

  const endDrag = useCallback(() => {
    dragSession.current = null;
  }, []);

  const createPanResponder = useCallback(
    (target: DragTarget) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const touch = event.nativeEvent;
          beginDrag(target, touch.pageX, touch.pageY);
        },
        onPanResponderMove: (event) => {
          const touch = event.nativeEvent;
          updateDrag(touch.pageX, touch.pageY);
        },
        onPanResponderRelease: endDrag,
        onPanResponderTerminate: endDrag,
      }),
    [beginDrag, endDrag, updateDrag],
  );

  const panResponders = useMemo(
    () => ({
      bl: createPanResponder("bl"),
      bottom: createPanResponder("bottom"),
      br: createPanResponder("br"),
      left: createPanResponder("left"),
      right: createPanResponder("right"),
      tl: createPanResponder("tl"),
      top: createPanResponder("top"),
      tr: createPanResponder("tr"),
    }),
    [createPanResponder],
  );

  if (!image) {
    return null;
  }

  const handleLayout = (event: LayoutChangeEvent) => {
    setFrame({
      width: event.nativeEvent.layout.width,
      height: event.nativeEvent.layout.height,
    });
  };

  const resetCrop = () => {
    const cropData = createPerspectiveCropData({
      width: image.width,
      height: image.height,
      rotation,
      preset: "free",
    });
    cornersRef.current = cropData.corners;
    setPreset("free");
    setCorners(cropData.corners);
  };

  const rotateCrop = () => {
    const nextRotation = normalizeRotation(rotation + 90);
    const cropData = createPerspectiveCropData({
      width: image.width,
      height: image.height,
      rotation: nextRotation,
      preset,
    });
    cornersRef.current = cropData.corners;
    setRotation(nextRotation);
    setCorners(cropData.corners);
  };

  const applyPreset = (nextPreset: CropPreset) => {
    const cropData = createPerspectiveCropData({
      width: image.width,
      height: image.height,
      rotation,
      preset: nextPreset,
    });
    cornersRef.current = cropData.corners;
    setPreset(nextPreset);
    setCorners(cropData.corners);
  };

  const applyCrop = () => {
    const cropData = createPerspectiveCropData({
      width: image.width,
      height: image.height,
      rotation,
      preset,
      corners,
    });
    onApply({
      ...image,
      cropPreset: preset,
      cropData,
      rotateDegrees: rotation,
    });
  };

  return (
    <Modal
      animationType="slide"
      visible={visible}
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <View
          style={[
            styles.shell,
            layout.contentMaxWidth
              ? { maxWidth: layout.contentMaxWidth }
              : null,
          ]}
        >
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={({ pressed }) => [
                styles.headerButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.headerButtonText}>Cancel</Text>
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>Crop & rotate</Text>
              <Text style={styles.headerSubtitle}>{sideLabel}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={resetCrop}
              style={({ pressed }) => [
                styles.headerButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.headerButtonText}>Reset</Text>
            </Pressable>
          </View>

          <View style={styles.editorFrame} onLayout={handleLayout}>
            <View
              style={[
                styles.imageRect,
                {
                  left: imageRect.x,
                  top: imageRect.y,
                  width: imageRect.width,
                  height: imageRect.height,
                },
              ]}
            >
              <Image
                source={{ uri: image.previewUri }}
                contentFit="contain"
                recyclingKey={`${image.previewUri}-${rotation}`}
                style={[
                  styles.image,
                  { transform: [{ rotate: `${rotation}deg` }] },
                ]}
              />
            </View>

            <Svg pointerEvents="none" style={StyleSheet.absoluteFill}>
              <Polygon
                fill="rgba(45, 212, 191, 0.14)"
                points={polygonPoints}
                stroke="#2DD4BF"
                strokeWidth={2}
              />
              <Line
                stroke="#2DD4BF99"
                strokeDasharray="6 6"
                strokeWidth={1}
                x1={framePoints.tl.x}
                x2={framePoints.br.x}
                y1={framePoints.tl.y}
                y2={framePoints.br.y}
              />
              <Line
                stroke="#2DD4BF99"
                strokeDasharray="6 6"
                strokeWidth={1}
                x1={framePoints.tr.x}
                x2={framePoints.bl.x}
                y1={framePoints.tr.y}
                y2={framePoints.bl.y}
              />
              {Object.values(handlePoints).map((point, index) => {
                const framePoint = pointToFrame(point, imageRect);
                return (
                  <Circle
                    key={index}
                    cx={framePoint.x}
                    cy={framePoint.y}
                    fill="#F8FAFC"
                    r={5}
                    stroke="#2DD4BF"
                    strokeWidth={2}
                  />
                );
              })}
            </Svg>

            {Object.entries(handlePoints).map(([target, point]) => {
              const framePoint = pointToFrame(point, imageRect);
              return (
                <View
                  key={target}
                  {...panResponders[target as DragTarget].panHandlers}
                  style={[
                    styles.dragHandle,
                    target.length > 2 && styles.sideHandle,
                    {
                      left: framePoint.x - 16,
                      top: framePoint.y - 16,
                    },
                  ]}
                />
              );
            })}
          </View>

          <View style={styles.controls}>
            <Pressable
              accessibilityRole="button"
              onPress={rotateCrop}
              style={({ pressed }) => [
                styles.rotateButton,
                pressed && styles.pressed,
              ]}
            >
              <BadgeIcon name="rotate" color={badgeColors.text} size={17} />
              <Text style={styles.rotateButtonText}>Rotate 90</Text>
            </Pressable>
            <View style={styles.presetRow}>
              <PresetButton
                label="Auto-fit"
                selected={preset === "auto"}
                onPress={() => applyPreset("auto")}
              />
              <PresetButton
                label="Landscape"
                selected={preset === "landscape"}
                onPress={() => applyPreset("landscape")}
              />
              <PresetButton
                label="Portrait"
                selected={preset === "portrait"}
                onPress={() => applyPreset("portrait")}
              />
              <PresetButton
                label="Free"
                selected={preset === "free"}
                onPress={() => applyPreset("free")}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={applyCrop}
              style={({ pressed }) => [
                styles.applyButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.applyButtonText}>Apply crop</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

type PresetButtonProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function PresetButton({ label, selected, onPress }: PresetButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.presetButton,
        selected && styles.presetButtonSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.presetButtonText,
          selected && styles.presetButtonTextSelected,
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
    backgroundColor: badgeColors.bg,
  },
  shell: {
    flex: 1,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  headerButton: {
    minWidth: 64,
    minHeight: 40,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  headerButtonText: {
    color: badgeColors.textMuted,
    fontSize: 12,
    fontWeight: "900",
  },
  headerCopy: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    color: badgeColors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  headerSubtitle: {
    color: badgeColors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  editorFrame: {
    flex: 1,
    marginHorizontal: 20,
    marginTop: 8,
    minHeight: 0,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#020817",
  },
  imageRect: {
    position: "absolute",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  dragHandle: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  sideHandle: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  controls: {
    borderTopWidth: 1,
    borderTopColor: badgeColors.border,
    backgroundColor: badgeColors.bg,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 11,
  },
  rotateButton: {
    alignSelf: "center",
    minHeight: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: badgeColors.border,
    backgroundColor: badgeColors.surfaceElevated,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 13,
  },
  rotateButtonText: {
    color: badgeColors.text,
    fontSize: 12,
    fontWeight: "900",
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  presetButton: {
    flexGrow: 1,
    minHeight: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: badgeColors.border,
    backgroundColor: badgeColors.surfaceElevated,
    paddingHorizontal: 10,
  },
  presetButtonSelected: {
    borderColor: alpha(badgeColors.primary, "88"),
    backgroundColor: alpha(badgeColors.primary, "22"),
  },
  presetButtonText: {
    color: badgeColors.textMuted,
    fontSize: 11,
    fontWeight: "900",
  },
  presetButtonTextSelected: {
    color: badgeColors.text,
  },
  applyButton: {
    minHeight: 48,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: badgeColors.primary,
  },
  applyButtonText: {
    color: badgeColors.onPrimary,
    fontSize: 14,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.78,
  },
});
