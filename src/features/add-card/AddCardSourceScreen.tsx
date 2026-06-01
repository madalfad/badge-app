import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDatabaseContext } from "@/db/DatabaseProvider";
import { createCardFromImages } from "@/features/cards/cardService";
import type { CropPreset, SourceCardImage } from "@/storage/imagePipeline";

type CardSide = "front" | "back";
type PickedCardImage = SourceCardImage & {
  previewUri: string;
};

type PickerSource = "camera" | "library";

const ACCENT_PRESETS = ["#2DD4BF", "#60A5FA", "#A78BFA", "#FBBF24", "#F87171"];

function toPickedImage(asset: ImagePicker.ImagePickerAsset): PickedCardImage {
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

export function AddCardSourceScreen() {
  const router = useRouter();
  const { db, isReady } = useDatabaseContext();
  const [frontImage, setFrontImage] = useState<PickedCardImage | null>(null);
  const [backImage, setBackImage] = useState<PickedCardImage | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [category, setCategory] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [cropPreset, setCropPreset] = useState<CropPreset>("auto");
  const [accentColor, setAccentColor] = useState(ACCENT_PRESETS[0]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const canSave = Boolean(
    db && frontImage && title.trim().length > 0 && !isSaving,
  );

  useEffect(() => {
    let isMounted = true;

    async function restorePendingPickerResult() {
      try {
        const pendingResult = await ImagePicker.getPendingResultAsync();
        if (
          !isMounted ||
          !pendingResult ||
          !("canceled" in pendingResult) ||
          pendingResult.canceled ||
          !pendingResult.assets?.[0]
        ) {
          return;
        }
        setFrontImage(
          (current) => current ?? toPickedImage(pendingResult.assets[0]),
        );
      } catch {
        // Best effort recovery for Android activity recreation.
      }
    }

    restorePendingPickerResult();

    return () => {
      isMounted = false;
    };
  }, []);

  const tags = useMemo(() => parseTags(tagsText), [tagsText]);

  const requestPermission = async (source: PickerSource) => {
    if (source === "camera") {
      const result = await ImagePicker.requestCameraPermissionsAsync();
      return result.granted;
    }

    const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return result.granted;
  };

  const launchPicker = async (side: CardSide, source: PickerSource) => {
    const hasPermission = await requestPermission(source);
    if (!hasPermission) {
      Alert.alert(
        "Permission required",
        source === "camera"
          ? "Camera permission is required to capture a badge card."
          : "Photo library permission is required to import a badge card.",
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

    const nextImage = toPickedImage(result.assets[0]);
    if (side === "front") {
      setFrontImage(nextImage);
      if (!title.trim()) {
        const nameWithoutExtension = result.assets[0].fileName?.replace(
          /\.[^/.]+$/,
          "",
        );
        setTitle(nameWithoutExtension || "New badge card");
      }
      return;
    }

    setBackImage(nextImage);
  };

  const rotateImage = (side: CardSide) => {
    const update = (image: PickedCardImage | null) =>
      image
        ? { ...image, rotateDegrees: ((image.rotateDegrees ?? 0) + 90) % 360 }
        : image;

    if (side === "front") {
      setFrontImage(update);
      return;
    }

    setBackImage(update);
  };

  const handleSave = async () => {
    if (!db || !frontImage) {
      Alert.alert(
        "Native storage unavailable",
        "Adding cards requires the native SQLite/file-system runtime.",
      );
      return;
    }

    if (!title.trim()) {
      Alert.alert(
        "Title required",
        "Give this badge card a short title before saving.",
      );
      return;
    }

    setIsSaving(true);
    try {
      const cardId = await createCardFromImages(db, {
        title,
        subtitle,
        categoryName: category,
        tags,
        isFavorite,
        primaryColor: accentColor,
        frontImage: { ...frontImage, cropPreset },
        backImage: backImage ? { ...backImage, cropPreset } : null,
      });

      router.replace({
        pathname: "/card/[id]",
        params: { id: cardId },
      });
    } catch (caughtError) {
      Alert.alert(
        "Couldn’t save card",
        caughtError instanceof Error
          ? caughtError.message
          : "The image could not be processed. Try another image or retake the photo.",
      );
    } finally {
      setIsSaving(false);
    }
  };

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
            <Text style={styles.eyebrow}>Import card</Text>
            <Text style={styles.headerTitle}>Add badge card</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={!canSave}
            onPress={handleSave}
            style={[styles.saveButton, !canSave && styles.disabledButton]}
          >
            {isSaving ? (
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
                The add-card flow uses SQLite, file storage, image picker, and
                image manipulation. Test it in a development build.
              </Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Images</Text>
            <ImagePickerPanel
              label="Front side"
              image={frontImage}
              required
              onCamera={() => launchPicker("front", "camera")}
              onLibrary={() => launchPicker("front", "library")}
              onRotate={() => rotateImage("front")}
              onClear={() => setFrontImage(null)}
            />
            <ImagePickerPanel
              label="Back side"
              image={backImage}
              onCamera={() => launchPicker("back", "camera")}
              onLibrary={() => launchPicker("back", "library")}
              onRotate={() => rotateImage("back")}
              onClear={() => setBackImage(null)}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Crop preset</Text>
            <View style={styles.segmentRow}>
              <SegmentButton
                label="Auto-fit"
                selected={cropPreset === "auto"}
                onPress={() => setCropPreset("auto")}
              />
              <SegmentButton
                label="Landscape"
                selected={cropPreset === "landscape"}
                onPress={() => setCropPreset("landscape")}
              />
              <SegmentButton
                label="Portrait"
                selected={cropPreset === "portrait"}
                onPress={() => setCropPreset("portrait")}
              />
            </View>
            <Text style={styles.helperText}>
              Presets center-crop the saved display/thumbnail images. Use rotate
              if the camera captured sideways.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Metadata</Text>
            <FormField
              label="Title"
              value={title}
              placeholder="e.g. Sepsis quick guide"
              onChangeText={setTitle}
            />
            <FormField
              label="Subtitle"
              value={subtitle}
              placeholder="Optional note or source"
              onChangeText={setSubtitle}
            />
            <FormField
              label="Category"
              value={category}
              placeholder="e.g. ICU, ED, Pediatrics"
              onChangeText={setCategory}
            />
            <FormField
              label="Tags"
              value={tagsText}
              placeholder="comma, separated, tags"
              onChangeText={setTagsText}
            />

            <View style={styles.favoriteRow}>
              <View style={styles.favoriteCopy}>
                <Text style={styles.inputLabel}>Favorite</Text>
                <Text style={styles.helperText}>
                  Pin this card visually in the reel.
                </Text>
              </View>
              <Switch value={isFavorite} onValueChange={setIsFavorite} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Accent color</Text>
            <View style={styles.colorRow}>
              {ACCENT_PRESETS.map((color) => (
                <Pressable
                  key={color}
                  accessibilityRole="button"
                  accessibilityState={{ selected: accentColor === color }}
                  onPress={() => setAccentColor(color)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    accentColor === color && styles.selectedSwatch,
                  ]}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type ImagePickerPanelProps = {
  label: string;
  image: PickedCardImage | null;
  required?: boolean;
  onCamera: () => void;
  onLibrary: () => void;
  onRotate: () => void;
  onClear: () => void;
};

function ImagePickerPanel({
  label,
  image,
  required,
  onCamera,
  onLibrary,
  onRotate,
  onClear,
}: ImagePickerPanelProps) {
  return (
    <View style={styles.imagePanel}>
      <View style={styles.imagePanelHeader}>
        <Text style={styles.imagePanelTitle}>
          {label}
          {required ? " *" : ""}
        </Text>
        {image ? (
          <Text style={styles.imageMeta}>
            {image.width} × {image.height}
          </Text>
        ) : null}
      </View>

      {image ? (
        <View style={styles.previewFrame}>
          <Image
            source={{ uri: image.previewUri }}
            contentFit="contain"
            style={[
              styles.previewImage,
              { transform: [{ rotate: `${image.rotateDegrees ?? 0}deg` }] },
            ]}
          />
        </View>
      ) : (
        <View style={styles.emptyPreview}>
          <Text style={styles.emptyPreviewTitle}>No image selected</Text>
          <Text style={styles.emptyPreviewText}>
            Use camera or photo library to add this side.
          </Text>
        </View>
      )}

      <View style={styles.imageActionsRow}>
        <ActionButton label="Camera" onPress={onCamera} />
        <ActionButton label="Photos" onPress={onLibrary} />
        <ActionButton label="Rotate" onPress={onRotate} disabled={!image} />
        <ActionButton
          label="Clear"
          onPress={onClear}
          disabled={!image}
          danger
        />
      </View>
    </View>
  );
}

type FormFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
};

function FormField({
  label,
  value,
  placeholder,
  onChangeText,
}: FormFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor="#64748B"
        onChangeText={onChangeText}
        style={styles.input}
      />
    </View>
  );
}

type SegmentButtonProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function SegmentButton({ label, selected, onPress }: SegmentButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.segmentButton,
        selected && styles.segmentButtonSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[styles.segmentText, selected && styles.segmentTextSelected]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
};

function ActionButton({ label, onPress, disabled, danger }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        danger && styles.dangerAction,
        disabled && styles.disabledAction,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.actionButtonText,
          danger && styles.dangerActionText,
          disabled && styles.disabledText,
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
    backgroundColor: "#07111F",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#26364F",
  },
  headerButton: {
    minWidth: 74,
    borderRadius: 999,
    backgroundColor: "#17243A",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerButtonText: {
    color: "#F8FAFC",
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
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  headerTitle: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 2,
  },
  saveButton: {
    minWidth: 74,
    minHeight: 40,
    borderRadius: 999,
    backgroundColor: "#2DD4BF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  saveButtonText: {
    color: "#04111F",
    fontSize: 13,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.42,
  },
  content: {
    padding: 18,
    paddingBottom: 38,
    gap: 18,
  },
  warningBox: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#FBBF2477",
    backgroundColor: "#FBBF241A",
    padding: 16,
  },
  warningTitle: {
    color: "#FBBF24",
    fontSize: 15,
    fontWeight: "900",
  },
  warningText: {
    color: "#FDE68A",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    marginTop: 6,
  },
  section: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#26364F",
    backgroundColor: "#101C2E",
    padding: 16,
    gap: 14,
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 17,
    fontWeight: "900",
  },
  imagePanel: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#26364F",
    backgroundColor: "#07111F",
    padding: 12,
    gap: 12,
  },
  imagePanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  imagePanelTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "900",
  },
  imageMeta: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800",
  },
  previewFrame: {
    height: 240,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#020817",
    borderWidth: 1,
    borderColor: "#26364F",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  emptyPreview: {
    height: 168,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#26364F",
    borderStyle: "dashed",
    padding: 20,
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
  imageActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionButton: {
    borderRadius: 14,
    backgroundColor: "#17243A",
    borderWidth: 1,
    borderColor: "#26364F",
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  dangerAction: {
    backgroundColor: "#F871711F",
    borderColor: "#F8717166",
  },
  disabledAction: {
    opacity: 0.4,
  },
  actionButtonText: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "900",
  },
  dangerActionText: {
    color: "#FCA5A5",
  },
  disabledText: {
    color: "#94A3B8",
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  segmentButton: {
    flexGrow: 1,
    borderRadius: 15,
    backgroundColor: "#17243A",
    borderWidth: 1,
    borderColor: "#26364F",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  segmentButtonSelected: {
    backgroundColor: "#2DD4BF22",
    borderColor: "#2DD4BF99",
  },
  segmentText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "900",
  },
  segmentTextSelected: {
    color: "#F8FAFC",
  },
  helperText: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  field: {
    gap: 8,
  },
  inputLabel: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  input: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#26364F",
    backgroundColor: "#07111F",
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "700",
    paddingHorizontal: 14,
  },
  favoriteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#26364F",
    backgroundColor: "#07111F",
    padding: 14,
  },
  favoriteCopy: {
    flex: 1,
    gap: 4,
  },
  colorRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  colorSwatch: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 3,
    borderColor: "#FFFFFF20",
  },
  selectedSwatch: {
    borderColor: "#F8FAFC",
  },
  pressed: {
    opacity: 0.78,
  },
});
