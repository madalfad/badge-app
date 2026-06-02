import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDatabaseContext } from "@/db/DatabaseProvider";
import {
  deleteCardRecordAndFiles,
  removeCardAssetSide,
  replaceCardAssetImage,
  updateCardMetadata,
} from "@/features/cards/cardService";
import { useCard } from "@/features/cards/useCard";
import type { CardImageSide } from "@/storage/imagePipeline";

import {
  AssetReplacementPanel,
  type PendingCardImage,
} from "./AssetReplacementPanel";
import {
  EDIT_CARD_ACCENT_PRESETS,
  MetadataForm,
} from "./MetadataForm";

type PickerSource = "camera" | "library";

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
    cropPreset: "auto",
  };
}

function parseTags(tagsText: string) {
  return Array.from(
    new Set(
      tagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
}

export function EditCardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const cardId = getRouteCardId(params.id);
  const { db, isReady } = useDatabaseContext();
  const { card, assets, tags, error, isLoading, reload } = useCard(cardId);

  const [initializedCardId, setInitializedCardId] = useState<string | null>(
    null,
  );
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [category, setCategory] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [accentColor, setAccentColor] = useState(EDIT_CARD_ACCENT_PRESETS[0]);
  const [pendingFrontImage, setPendingFrontImage] =
    useState<PendingCardImage | null>(null);
  const [pendingBackImage, setPendingBackImage] =
    useState<PendingCardImage | null>(null);
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

  useEffect(() => {
    if (!card || initializedCardId === card.id) {
      return;
    }

    setTitle(card.title);
    setSubtitle(card.subtitle ?? "");
    setCategory(card.category === "Uncategorized" ? "" : card.category);
    setTagsText(tags.join(", "));
    setIsFavorite(card.isFavorite);
    setAccentColor(card.accentColor);
    setInitializedCardId(card.id);
  }, [card, initializedCardId, tags]);

  const canSaveMetadata = Boolean(
    db && cardId && title.trim().length > 0 && !isSavingMetadata,
  );

  const requestPermission = async (source: PickerSource) => {
    if (source === "camera") {
      const result = await ImagePicker.requestCameraPermissionsAsync();
      return result.granted;
    }

    const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return result.granted;
  };

  const launchPicker = async (side: CardImageSide, source: PickerSource) => {
    const hasPermission = await requestPermission(source);
    if (!hasPermission) {
      Alert.alert(
        "Permission required",
        source === "camera"
          ? "Camera permission is required to capture a replacement image."
          : "Photo library permission is required to import a replacement image.",
      );
      return;
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            allowsEditing: false,
            quality: 1,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: false,
            quality: 1,
          });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    setStatusMessage(null);
    const pendingImage = toPendingImage(result.assets[0]);
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

    setIsSavingMetadata(true);
    setStatusMessage(null);
    try {
      await updateCardMetadata(db, cardId, {
        title,
        subtitle,
        categoryName: category,
        tags: parseTags(tagsText),
        isFavorite,
        primaryColor: accentColor,
      });
      setStatusMessage("Metadata saved.");
      await reload();
    } catch (caughtError) {
      Alert.alert(
        "Couldn’t save metadata",
        caughtError instanceof Error
          ? caughtError.message
          : "The card metadata could not be updated.",
      );
    } finally {
      setIsSavingMetadata(false);
    }
  };

  const savePendingImage = async (side: CardImageSide) => {
    const pendingImage = side === "front" ? pendingFrontImage : pendingBackImage;
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

    Alert.alert("Remove back image?", "The front side will stay on this card.", [
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
    ]);
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
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator color="#2DD4BF" />
        <Text style={styles.centeredStateText}>Loading editor…</Text>
      </View>
    );
  }

  if (!card || error) {
    return (
      <SafeAreaView style={styles.centeredState}>
        <Text style={styles.errorTitle}>Card unavailable</Text>
        <Text style={styles.errorText}>
          {error?.message ?? "This card could not be loaded for editing."}
        </Text>
        <Pressable style={styles.primaryButton} onPress={() => router.replace("/")}>
          <Text style={styles.primaryButtonText}>Back to reel</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.headerButton}
          >
            <Text style={styles.headerButtonText}>Cancel</Text>
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.eyebrow}>Edit card</Text>
            <Text numberOfLines={1} style={styles.headerTitle}>
              {card.title}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={!canSaveMetadata}
            onPress={saveMetadata}
            style={[styles.saveButton, !canSaveMetadata && styles.disabledButton]}
          >
            {isSavingMetadata ? (
              <ActivityIndicator color="#04111F" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {!db && isReady ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>Native build required</Text>
              <Text style={styles.warningText}>
                Editing stored cards uses SQLite, local file storage, image
                picker, and image manipulation. Test it in a development build.
              </Text>
            </View>
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Images</Text>
            <Text style={styles.sectionHelp}>
              Replacements are staged until you tap Save image. The previous
              stored files are removed only after the database update succeeds.
            </Text>
            <AssetReplacementPanel
              side="front"
              asset={frontAsset}
              pendingImage={pendingFrontImage}
              isSaving={savingSide === "front"}
              onCamera={() => launchPicker("front", "camera")}
              onLibrary={() => launchPicker("front", "library")}
              onRotate={() => rotatePendingImage("front")}
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
              onDiscardPending={() => setPendingBackImage(null)}
              onSaveReplacement={() => savePendingImage("back")}
              onRemove={removeBackImage}
            />
          </View>

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
                (isSavingMetadata || Boolean(savingSide)) && styles.disabledButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.deleteButtonText}>Delete card</Text>
            </Pressable>
          </View>
        </ScrollView>
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
  centeredState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#07111F",
    padding: 24,
  },
  centeredStateText: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 12,
  },
  errorTitle: {
    color: "#F8FAFC",
    fontSize: 24,
    fontWeight: "900",
  },
  errorText: {
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 18,
  },
  primaryButton: {
    borderRadius: 16,
    backgroundColor: "#2DD4BF",
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  primaryButtonText: {
    color: "#04111F",
    fontSize: 14,
    fontWeight: "900",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#17243A",
  },
  headerButton: {
    minWidth: 76,
    borderRadius: 16,
    backgroundColor: "#17243A",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  headerButtonText: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "900",
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: "center",
  },
  eyebrow: {
    color: "#2DD4BF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  headerTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 3,
  },
  saveButton: {
    minWidth: 76,
    minHeight: 42,
    borderRadius: 16,
    backgroundColor: "#2DD4BF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  saveButtonText: {
    color: "#04111F",
    fontSize: 13,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.45,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  warningBox: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#FBBF2466",
    backgroundColor: "#FBBF2417",
    padding: 14,
  },
  warningTitle: {
    color: "#FDE68A",
    fontSize: 13,
    fontWeight: "900",
  },
  warningText: {
    color: "#FDE68A",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 5,
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
