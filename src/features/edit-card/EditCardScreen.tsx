import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useBadgeLayout } from "@/components/badge-ui";
import { useDatabaseContext } from "@/db/DatabaseProvider";
import { CardEditorHeader } from "@/features/cards/CardEditorHeader";
import {
  CardLoadingState,
  CardUnavailableState,
} from "@/features/cards/CardRouteStates";
import { NativeStorageWarning } from "@/features/cards/NativeStorageWarning";
import {
  PerspectiveCropEditorModal,
  type EditableCropImage,
} from "@/features/crop/PerspectiveCropEditorModal";
import {
  deleteCardRecordAndFiles,
  removeCardAssetSide,
  replaceCardAssetImage,
  updateCardMetadata,
  updateCardTextContent,
} from "@/features/cards/cardService";
import {
  CARD_ACCENT_PRESETS,
  parseCardTags,
} from "@/features/cards/cardMetadata";
import { useCardMetadataDraft } from "@/features/cards/useCardMetadataDraft";
import {
  createDraftTextSection,
  createDraftTextSectionsFromSections,
  TextCardContentEditor,
} from "@/features/cards/TextCardContentEditor";
import { useDraftTextSections } from "@/features/cards/useDraftTextSections";
import { useCard } from "@/features/cards/useCard";
import {
  launchCardImagePicker,
  type CardImagePickerSource,
} from "@/features/cards/cardImagePicker";
import { DEFAULT_REEL_ID } from "@/features/reels/constants";
import { ReelMembershipField } from "@/features/reels/ReelMembershipField";
import { useReels } from "@/features/reels/useReels";
import type { CardAssetRecord } from "@/features/cards/types";
import type { CardImageSide } from "@/storage/imagePipeline";
import {
  parseLegacyCropData,
  parsePerspectiveCropData,
} from "@/storage/cropGeometry";

import {
  AssetReplacementPanel,
  type PendingCardImage,
} from "./AssetReplacementPanel";
import { MetadataForm } from "./MetadataForm";

function getRouteCardId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : (value ?? null);
}

function toPendingImage(asset: ImagePicker.ImagePickerAsset): PendingCardImage {
  return {
    uri: asset.uri,
    previewUri: asset.uri,
    width: asset.width,
    height: asset.height,
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    rotateDegrees: 0,
    cropPreset: "free",
  };
}

function toEditableImageFromAsset(asset: CardAssetRecord): EditableCropImage {
  const perspectiveCrop = parsePerspectiveCropData(asset.cropDataJson);
  const legacyCrop = parseLegacyCropData(asset.cropDataJson);
  return {
    uri: asset.fileUri,
    previewUri: asset.fileUri,
    width: perspectiveCrop?.sourceWidth ?? asset.width,
    height: perspectiveCrop?.sourceHeight ?? asset.height,
    mimeType: asset.mimeType,
    rotateDegrees: perspectiveCrop?.rotation ?? legacyCrop?.rotation ?? 0,
    cropPreset: perspectiveCrop?.preset ?? legacyCrop?.preset ?? "free",
    cropData: perspectiveCrop ?? undefined,
    cropDataJson: asset.cropDataJson,
  };
}

// fallow-ignore-next-line complexity
export function EditCardScreen() {
  const router = useRouter();
  const layout = useBadgeLayout();
  const params = useLocalSearchParams<{ id: string }>();
  const cardId = getRouteCardId(params.id);
  const { db, isReady } = useDatabaseContext();
  const { card, assets, tags, reelIds, error, isLoading, reload } =
    useCard(cardId);
  const reelsState = useReels();

  const [initializedCardId, setInitializedCardId] = useState<string | null>(
    null,
  );
  const {
    category,
    code,
    setCategory,
    setCode,
    setSubtitle,
    setTagsText,
    setTitle,
    subtitle,
    tagsText,
    title,
  } = useCardMetadataDraft();
  const {
    addSection: addTextSection,
    normalizedSections: typedSections,
    removeSection: removeTextSection,
    sections: textSections,
    setSections: setTextSections,
    updateSection: updateTextSection,
  } = useDraftTextSections(() => [createDraftTextSection()]);
  const [footer, setFooter] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [accentColor, setAccentColor] = useState(CARD_ACCENT_PRESETS[0]);
  const [selectedReelIds, setSelectedReelIds] = useState<string[]>([]);
  const [initializedReelCardId, setInitializedReelCardId] = useState<
    string | null
  >(null);
  const [pendingFrontImage, setPendingFrontImage] =
    useState<PendingCardImage | null>(null);
  const [pendingBackImage, setPendingBackImage] =
    useState<PendingCardImage | null>(null);
  const [cropTarget, setCropTarget] = useState<{
    side: CardImageSide;
    image: EditableCropImage;
  } | null>(null);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [savingSide, setSavingSide] = useState<CardImageSide | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const frontAsset = useMemo(
    () => assets.find((asset) => asset.side === "front") ?? null,
    [assets],
  );
  const backAsset = useMemo(
    () => assets.find((asset) => asset.side === "back") ?? null,
    [assets],
  );
  const canEditTextContent = Boolean(
    card &&
      (card.sourceType === "user_text" ||
        card.sourceType === "sample_seed" ||
        (!frontAsset && card.sections.length > 0)),
  );
  const shouldShowImageEditor = Boolean(
    frontAsset || backAsset || !canEditTextContent,
  );

  useEffect(() => {
    if (!card || initializedCardId === card.id) {
      return;
    }

    setTitle(card.title);
    setSubtitle(card.subtitle ?? "");
    setCategory(card.category === "Uncategorized" ? "" : card.category);
    setTagsText(tags.join(", "));
    setCode(card.code);
    setTextSections(createDraftTextSectionsFromSections(card.sections));
    setFooter(card.footer);
    setIsFavorite(card.isFavorite);
    setAccentColor(card.accentColor);
    setInitializedCardId(card.id);
  }, [card, initializedCardId, tags]);

  useEffect(() => {
    if (
      !cardId ||
      initializedReelCardId === cardId ||
      isLoading ||
      reelsState.reels.length === 0
    ) {
      return;
    }

    const availableReelIds = new Set(reelsState.reels.map((reel) => reel.id));
    const nextReelIds = reelIds.filter((reelId) =>
      availableReelIds.has(reelId),
    );
    setSelectedReelIds(
      nextReelIds.length > 0 ? nextReelIds : [DEFAULT_REEL_ID],
    );
    setInitializedReelCardId(cardId);
  }, [cardId, initializedReelCardId, isLoading, reelIds, reelsState.reels]);

  const canSaveMetadata = Boolean(
    db &&
      cardId &&
      title.trim().length > 0 &&
      (!canEditTextContent || typedSections.length > 0) &&
      !isSavingMetadata,
  );

  const launchPicker = async (
    side: CardImageSide,
    source: CardImagePickerSource,
  ) => {
    const asset = await launchCardImagePicker(source, {
      camera: "Camera permission is required to capture a replacement image.",
      library:
        "Photo library permission is required to import a replacement image.",
    });

    if (!asset) {
      return;
    }

    setStatusMessage(null);
    const pendingImage = toPendingImage(asset);
    if (side === "front") {
      setPendingFrontImage(pendingImage);
      return;
    }
    setPendingBackImage(pendingImage);
  };

  const rotatePendingImage = (side: CardImageSide) => {
    const update = (image: PendingCardImage | null) =>
      image
        ? { ...image, rotateDegrees: ((image.rotateDegrees ?? 0) + 90) % 360 }
        : image;

    if (side === "front") {
      setPendingFrontImage(update);
      return;
    }
    setPendingBackImage(update);
  };

  const openCropEditor = (side: CardImageSide) => {
    const pendingImage =
      side === "front" ? pendingFrontImage : pendingBackImage;
    const asset = side === "front" ? frontAsset : backAsset;
    const image = pendingImage ?? (asset ? toEditableImageFromAsset(asset) : null);
    if (!image) {
      return;
    }

    setCropTarget({ side, image });
  };

  const saveMetadata = async () => {
    if (!db || !cardId) {
      Alert.alert(
        "Native storage unavailable",
        "Editing cards requires the native SQLite/file-system runtime.",
      );
      return;
    }

    if (!title.trim()) {
      Alert.alert("Title required", "Give this badge card a short title.");
      return;
    }

    if (canEditTextContent && typedSections.length === 0) {
      Alert.alert("Text row required", "Add at least one text row.");
      return;
    }

    setIsSavingMetadata(true);
    setStatusMessage(null);
    try {
      await updateCardMetadata(db, cardId, {
        title,
        subtitle,
        categoryName: category,
        tags: parseCardTags(tagsText),
        isFavorite,
        primaryColor: accentColor,
        reelIds: selectedReelIds,
      });

      if (canEditTextContent) {
        await updateCardTextContent(db, cardId, {
          code,
          sections: typedSections,
          footer,
        });
      }

      setStatusMessage(canEditTextContent ? "Card saved." : "Metadata saved.");
      await Promise.all([reload(), reelsState.reload()]);
    } catch (caughtError) {
      Alert.alert(
        canEditTextContent ? "Couldn’t save card" : "Couldn’t save metadata",
        caughtError instanceof Error
          ? caughtError.message
          : "The card metadata could not be updated.",
      );
    } finally {
      setIsSavingMetadata(false);
    }
  };

  const savePendingImage = async (side: CardImageSide) => {
    const pendingImage =
      side === "front" ? pendingFrontImage : pendingBackImage;
    if (!pendingImage || !db || !cardId) {
      Alert.alert(
        "Native storage unavailable",
        "Replacing images requires the native SQLite/file-system runtime.",
      );
      return;
    }

    setSavingSide(side);
    setStatusMessage(null);
    try {
      await replaceCardAssetImage(db, cardId, side, pendingImage);
      if (side === "front") {
        setPendingFrontImage(null);
      } else {
        setPendingBackImage(null);
      }
      setStatusMessage(`${side === "front" ? "Front" : "Back"} image saved.`);
      await reload();
    } catch (caughtError) {
      Alert.alert(
        "Couldn’t save image",
        caughtError instanceof Error
          ? caughtError.message
          : "The image could not be processed. Try another image or retake the photo.",
      );
    } finally {
      setSavingSide(null);
    }
  };

  const removeBackImage = () => {
    if (!db || !cardId || !backAsset) {
      return;
    }

    Alert.alert(
      "Remove back image?",
      "The front side will stay on this card.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setSavingSide("back");
            setStatusMessage(null);
            try {
              await removeCardAssetSide(db, cardId, "back");
              setPendingBackImage(null);
              setStatusMessage("Back image removed.");
              await reload();
            } catch (caughtError) {
              Alert.alert(
                "Couldn’t remove image",
                caughtError instanceof Error
                  ? caughtError.message
                  : "The back image could not be removed.",
              );
            } finally {
              setSavingSide(null);
            }
          },
        },
      ],
    );
  };

  const deleteCard = () => {
    if (!db || !cardId) {
      return;
    }

    Alert.alert(
      "Delete card?",
      "This permanently removes the card metadata and stored image files from this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsSavingMetadata(true);
            try {
              await deleteCardRecordAndFiles(db, cardId);
              router.replace("/");
            } catch (caughtError) {
              Alert.alert(
                "Couldn’t delete card",
                caughtError instanceof Error
                  ? caughtError.message
                  : "The card could not be deleted.",
              );
            } finally {
              setIsSavingMetadata(false);
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return <CardLoadingState message="Loading editor…" />;
  }

  if (!card || error) {
    return (
      <CardUnavailableState
        message={error?.message ?? "This card could not be loaded for editing."}
        onBackToReel={() => router.replace("/")}
      />
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoidingView}
      >
        <CardEditorHeader
          eyebrow="Edit card"
          title={card.title}
          canSave={canSaveMetadata}
          isSaving={isSavingMetadata}
          onCancel={() => router.back()}
          onSave={saveMetadata}
        />

        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            {
              alignSelf: "center",
              maxWidth: layout.contentMaxWidth,
              paddingHorizontal: layout.gutter,
              width: "100%",
            },
          ]}
        >
          {!db && isReady ? (
            <NativeStorageWarning text="Editing stored cards uses SQLite, local file storage, image picker, and image manipulation. Test it in a development build." />
          ) : null}

          {statusMessage ? (
            <View style={styles.statusBox}>
              <Text style={styles.statusText}>{statusMessage}</Text>
            </View>
          ) : null}

          <MetadataForm
            title={title}
            subtitle={subtitle}
            category={category}
            tagsText={tagsText}
            isFavorite={isFavorite}
            accentColor={accentColor}
            onTitleChange={setTitle}
            onSubtitleChange={setSubtitle}
            onCategoryChange={setCategory}
            onTagsTextChange={setTagsText}
            onFavoriteChange={setIsFavorite}
            onAccentColorChange={setAccentColor}
          />

          {canEditTextContent ? (
            <TextCardContentEditor
              code={code}
              footer={footer}
              sections={textSections}
              onAddSection={addTextSection}
              onCodeChange={setCode}
              onFooterChange={setFooter}
              onRemoveSection={removeTextSection}
              onUpdateSection={updateTextSection}
            />
          ) : null}

          <ReelMembershipField
            reels={reelsState.reels}
            selectedReelIds={selectedReelIds}
            disabled={isSavingMetadata || isLoading}
            onChange={setSelectedReelIds}
          />

          {shouldShowImageEditor ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Images</Text>
              <Text style={styles.sectionHelp}>
                Replacements are staged until you tap Save image. The previous
                stored files are removed only after the database update
                succeeds.
              </Text>
              <AssetReplacementPanel
                side="front"
                asset={frontAsset}
                pendingImage={pendingFrontImage}
                isSaving={savingSide === "front"}
                onCamera={() => launchPicker("front", "camera")}
                onLibrary={() => launchPicker("front", "library")}
                onRotate={() => rotatePendingImage("front")}
                onEditCrop={() => openCropEditor("front")}
                onDiscardPending={() => setPendingFrontImage(null)}
                onSaveReplacement={() => savePendingImage("front")}
              />
              <AssetReplacementPanel
                side="back"
                asset={backAsset}
                pendingImage={pendingBackImage}
                isSaving={savingSide === "back"}
                onCamera={() => launchPicker("back", "camera")}
                onLibrary={() => launchPicker("back", "library")}
                onRotate={() => rotatePendingImage("back")}
                onEditCrop={() => openCropEditor("back")}
                onDiscardPending={() => setPendingBackImage(null)}
                onSaveReplacement={() => savePendingImage("back")}
                onRemove={removeBackImage}
              />
            </View>
          ) : null}

          <View style={styles.dangerZone}>
            <Text style={styles.dangerTitle}>Danger zone</Text>
            <Text style={styles.dangerText}>
              Deleting a card also deletes its locally stored front, back,
              display, and thumbnail files from this device.
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={isSavingMetadata || Boolean(savingSide)}
              onPress={deleteCard}
              style={({ pressed }) => [
                styles.deleteButton,
                (isSavingMetadata || Boolean(savingSide)) &&
                  styles.disabledButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.deleteButtonText}>Delete card</Text>
            </Pressable>
          </View>
        </ScrollView>
        <PerspectiveCropEditorModal
          image={cropTarget?.image ?? null}
          sideLabel={cropTarget?.side === "back" ? "Back side" : "Front side"}
          visible={Boolean(cropTarget)}
          onCancel={() => setCropTarget(null)}
          onApply={(nextImage: EditableCropImage) => {
            if (cropTarget?.side === "front") {
              setPendingFrontImage(nextImage);
            } else if (cropTarget?.side === "back") {
              setPendingBackImage(nextImage);
            }
            setCropTarget(null);
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#07111F",
  },
  keyboardAvoidingView: {
    flex: 1,
  },

  disabledButton: {
    opacity: 0.45,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },

  statusBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2DD4BF66",
    backgroundColor: "#2DD4BF17",
    padding: 12,
  },
  statusText: {
    color: "#99F6E4",
    fontSize: 12,
    fontWeight: "900",
  },
  section: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#26364F",
    backgroundColor: "#101C2E",
    padding: 16,
    gap: 14,
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "900",
  },
  sectionHelp: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  dangerZone: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F8717166",
    backgroundColor: "#F8717117",
    padding: 16,
    gap: 10,
  },
  dangerTitle: {
    color: "#FCA5A5",
    fontSize: 16,
    fontWeight: "900",
  },
  dangerText: {
    color: "#FECACA",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  deleteButton: {
    alignSelf: "flex-start",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F8717166",
    backgroundColor: "#7F1D1D",
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  deleteButtonText: {
    color: "#FEE2E2",
    fontSize: 13,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.78,
  },
});
