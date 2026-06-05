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
  onEditCrop: () => void;
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
  onEditCrop,
  onDiscardPending,
  onSaveReplacement,
  onRemove,
}: AssetReplacementPanelProps) {
  const isRequired = side === "front";
  const previewUri = getPreviewUri(asset, pendingImage);
  const dimensions = getImageDimensions(asset, pendingImage);

  return (
    <View style={styles.panel}>
      <AssetPanelHeader
        label={side === "front" ? "Front side" : "Back side"}
        subtitle={getPanelSubtitle(asset, pendingImage, isRequired)}
        dimensions={dimensions}
        isRequired={isRequired}
      />
      <AssetPreview pendingImage={pendingImage} previewUri={previewUri} />
      <AssetActions
        asset={asset}
        isRequired={isRequired}
        isSaving={isSaving}
        pendingImage={pendingImage}
        onCamera={onCamera}
        onDiscardPending={onDiscardPending}
        onLibrary={onLibrary}
        onRemove={onRemove}
        onEditCrop={onEditCrop}
        onRotate={onRotate}
        onSaveReplacement={onSaveReplacement}
      />
    </View>
  );
}

function getPreviewUri(
  asset: CardAssetRecord | null,
  pendingImage: PendingCardImage | null,
) {
  return (
    pendingImage?.previewUri ??
    asset?.displayUri ??
    asset?.thumbnailUri ??
    asset?.fileUri ??
    null
  );
}

function getImageDimensions(
  asset: CardAssetRecord | null,
  pendingImage: PendingCardImage | null,
) {
  if (pendingImage) {
    return `${pendingImage.width} × ${pendingImage.height}`;
  }

  if (asset) {
    return `${asset.width} × ${asset.height}`;
  }

  return null;
}

function getPanelSubtitle(
  asset: CardAssetRecord | null,
  pendingImage: PendingCardImage | null,
  isRequired: boolean,
) {
  if (pendingImage) {
    return "Pending replacement";
  }

  if (asset) {
    return "Current saved image";
  }

  return isRequired ? "Required for viewer" : "Optional back side";
}

type AssetPanelHeaderProps = {
  label: string;
  subtitle: string;
  dimensions: string | null;
  isRequired: boolean;
};

function AssetPanelHeader({
  label,
  subtitle,
  dimensions,
  isRequired,
}: AssetPanelHeaderProps) {
  return (
    <View style={styles.headerRow}>
      <View>
        <Text style={styles.panelTitle}>
          {label}
          {isRequired ? " *" : ""}
        </Text>
        <Text style={styles.panelSubtitle}>{subtitle}</Text>
      </View>
      {dimensions ? <Text style={styles.imageMeta}>{dimensions}</Text> : null}
    </View>
  );
}

type AssetPreviewProps = {
  previewUri: string | null;
  pendingImage: PendingCardImage | null;
};

function AssetPreview({ previewUri, pendingImage }: AssetPreviewProps) {
  if (!previewUri) {
    return (
      <View style={styles.emptyPreview}>
        <Text style={styles.emptyPreviewTitle}>No image saved</Text>
        <Text style={styles.emptyPreviewText}>
          Add an image from the camera or photo library.
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.previewFrame, pendingImage && styles.pendingPreviewFrame]}
    >
      <Image
        source={{ uri: previewUri }}
        contentFit="contain"
        recyclingKey={`${previewUri}-${pendingImage?.rotateDegrees ?? 0}`}
        style={[
          styles.previewImage,
          {
            transform: [{ rotate: `${pendingImage?.rotateDegrees ?? 0}deg` }],
          },
        ]}
      />
    </View>
  );
}

type AssetActionsProps = Omit<AssetReplacementPanelProps, "side"> & {
  isRequired: boolean;
};

function AssetActions({
  asset,
  pendingImage,
  isRequired,
  isSaving,
  onCamera,
  onLibrary,
  onRotate,
  onEditCrop,
  onDiscardPending,
  onSaveReplacement,
  onRemove,
}: AssetActionsProps) {
  return (
    <View style={styles.actionsRow}>
      <PanelButton label="Camera" onPress={onCamera} disabled={isSaving} />
      <PanelButton label="Photos" onPress={onLibrary} disabled={isSaving} />
      <PanelButton
        label="Rotate"
        onPress={onRotate}
        disabled={!pendingImage || isSaving}
      />
      <PanelButton
        label="Edit crop"
        onPress={onEditCrop}
        disabled={(!pendingImage && !asset) || isSaving}
      />
      {pendingImage ? (
        <PendingImageActions
          isSaving={isSaving}
          onDiscardPending={onDiscardPending}
          onSaveReplacement={onSaveReplacement}
        />
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
  );
}

type PendingImageActionsProps = {
  isSaving: boolean;
  onDiscardPending: () => void;
  onSaveReplacement: () => void;
};

function PendingImageActions({
  isSaving,
  onDiscardPending,
  onSaveReplacement,
}: PendingImageActionsProps) {
  return (
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
