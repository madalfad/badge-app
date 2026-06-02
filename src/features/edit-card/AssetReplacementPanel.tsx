import { Image } from "expo-image";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { CardAssetRecord } from "@/features/cards/types";
import type { CardImageSide, SourceCardImage } from "@/storage/imagePipeline";

export type PendingCardImage = SourceCardImage & {
  previewUri: string;
};

type AssetReplacementPanelProps = {
  side: CardImageSide;
  asset: CardAssetRecord | null;
  pendingImage: PendingCardImage | null;
  isSaving: boolean;
  onCamera: () => void;
  onLibrary: () => void;
  onRotate: () => void;
  onDiscardPending: () => void;
  onSaveReplacement: () => void;
  onRemove?: () => void;
};

export function AssetReplacementPanel({
  side,
  asset,
  pendingImage,
  isSaving,
  onCamera,
  onLibrary,
  onRotate,
  onDiscardPending,
  onSaveReplacement,
  onRemove,
}: AssetReplacementPanelProps) {
  const label = side === "front" ? "Front side" : "Back side";
  const isRequired = side === "front";
  const previewUri =
    pendingImage?.previewUri ??
    asset?.displayUri ??
    asset?.thumbnailUri ??
    asset?.fileUri ??
    null;
  const dimensions = pendingImage
    ? `${pendingImage.width} × ${pendingImage.height}`
    : asset
      ? `${asset.width} × ${asset.height}`
      : null;

  return (
    <View style={styles.panel}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.panelTitle}>
            {label}
            {isRequired ? " *" : ""}
          </Text>
          <Text style={styles.panelSubtitle}>
            {pendingImage
              ? "Pending replacement"
              : asset
                ? "Current saved image"
                : isRequired
                  ? "Required for viewer"
                  : "Optional back side"}
          </Text>
        </View>
        {dimensions ? <Text style={styles.imageMeta}>{dimensions}</Text> : null}
      </View>

      {previewUri ? (
        <View
          style={[
            styles.previewFrame,
            pendingImage && styles.pendingPreviewFrame,
          ]}
        >
          <Image
            source={{ uri: previewUri }}
            contentFit="contain"
            recyclingKey={`${previewUri}-${pendingImage?.rotateDegrees ?? 0}`}
            style={[
              styles.previewImage,
              {
                transform: [
                  { rotate: `${pendingImage?.rotateDegrees ?? 0}deg` },
                ],
              },
            ]}
          />
        </View>
      ) : (
        <View style={styles.emptyPreview}>
          <Text style={styles.emptyPreviewTitle}>No image saved</Text>
          <Text style={styles.emptyPreviewText}>
            Add an image from the camera or photo library.
          </Text>
        </View>
      )}

      <View style={styles.actionsRow}>
        <PanelButton label="Camera" onPress={onCamera} disabled={isSaving} />
        <PanelButton label="Photos" onPress={onLibrary} disabled={isSaving} />
        <PanelButton
          label="Rotate"
          onPress={onRotate}
          disabled={!pendingImage || isSaving}
        />
        {pendingImage ? (
          <>
            <PanelButton
              label={isSaving ? "Saving…" : "Save image"}
              onPress={onSaveReplacement}
              disabled={isSaving}
              primary
              loading={isSaving}
            />
            <PanelButton
              label="Discard"
              onPress={onDiscardPending}
              disabled={isSaving}
              danger
            />
          </>
        ) : null}
        {!pendingImage && !isRequired && asset && onRemove ? (
          <PanelButton
            label="Remove back"
            onPress={onRemove}
            disabled={isSaving}
            danger
          />
        ) : null}
      </View>
    </View>
  );
}

type PanelButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
  primary?: boolean;
  loading?: boolean;
};

function PanelButton({
  label,
  onPress,
  disabled,
  danger,
  primary,
  loading,
}: PanelButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        primary && styles.primaryAction,
        danger && styles.dangerAction,
        disabled && styles.disabledAction,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#04111F" size="small" />
      ) : (
        <Text
          style={[
            styles.actionButtonText,
            primary && styles.primaryActionText,
            danger && styles.dangerActionText,
            disabled && styles.disabledText,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#26364F",
    backgroundColor: "#101C2E",
    padding: 14,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  panelTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "900",
  },
  panelSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  imageMeta: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "800",
  },
  previewFrame: {
    height: 190,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#020817",
    borderWidth: 1,
    borderColor: "#26364F",
  },
  pendingPreviewFrame: {
    borderColor: "#2DD4BF99",
    backgroundColor: "#042F2E",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  emptyPreview: {
    height: 190,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#26364F",
    borderStyle: "dashed",
    padding: 18,
  },
  emptyPreviewTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "900",
  },
  emptyPreviewText: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 6,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionButton: {
    minHeight: 42,
    borderRadius: 15,
    backgroundColor: "#17243A",
    borderWidth: 1,
    borderColor: "#26364F",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  primaryAction: {
    backgroundColor: "#2DD4BF",
    borderColor: "#2DD4BF",
  },
  dangerAction: {
    backgroundColor: "#F871711F",
    borderColor: "#F8717166",
  },
  actionButtonText: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "900",
  },
  primaryActionText: {
    color: "#04111F",
  },
  dangerActionText: {
    color: "#FCA5A5",
  },
  disabledAction: {
    opacity: 0.48,
  },
  disabledText: {
    color: "#94A3B8",
  },
  pressed: {
    opacity: 0.78,
  },
});
