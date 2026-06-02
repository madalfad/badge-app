import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

export const EDIT_CARD_ACCENT_PRESETS = [
  "#2DD4BF",
  "#60A5FA",
  "#A78BFA",
  "#FBBF24",
  "#F87171",
];

type MetadataFormProps = {
  title: string;
  subtitle: string;
  category: string;
  tagsText: string;
  isFavorite: boolean;
  accentColor: string;
  onTitleChange: (value: string) => void;
  onSubtitleChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onTagsTextChange: (value: string) => void;
  onFavoriteChange: (value: boolean) => void;
  onAccentColorChange: (value: string) => void;
};

export function MetadataForm({
  title,
  subtitle,
  category,
  tagsText,
  isFavorite,
  accentColor,
  onTitleChange,
  onSubtitleChange,
  onCategoryChange,
  onTagsTextChange,
  onFavoriteChange,
  onAccentColorChange,
}: MetadataFormProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Metadata</Text>
      <FormField
        label="Title"
        value={title}
        placeholder="e.g. Sepsis quick guide"
        onChangeText={onTitleChange}
      />
      <FormField
        label="Subtitle"
        value={subtitle}
        placeholder="Optional note or source"
        onChangeText={onSubtitleChange}
      />
      <FormField
        label="Category"
        value={category}
        placeholder="e.g. ICU, ED, Pediatrics"
        onChangeText={onCategoryChange}
      />
      <FormField
        label="Tags"
        value={tagsText}
        placeholder="comma, separated, tags"
        onChangeText={onTagsTextChange}
      />

      <View style={styles.favoriteRow}>
        <View style={styles.favoriteCopy}>
          <Text style={styles.inputLabel}>Favorite</Text>
          <Text style={styles.helperText}>Pin this card visually in the reel.</Text>
        </View>
        <Switch value={isFavorite} onValueChange={onFavoriteChange} />
      </View>

      <View style={styles.colorGroup}>
        <Text style={styles.inputLabel}>Accent color</Text>
        <View style={styles.colorRow}>
          {EDIT_CARD_ACCENT_PRESETS.map((color) => (
            <Pressable
              key={color}
              accessibilityRole="button"
              accessibilityState={{ selected: accentColor === color }}
              onPress={() => onAccentColorChange(color)}
              style={({ pressed }) => [
                styles.colorSwatch,
                { backgroundColor: color },
                accentColor === color && styles.selectedSwatch,
                pressed && styles.pressed,
              ]}
            />
          ))}
        </View>
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

function FormField({ label, value, placeholder, onChangeText }: FormFieldProps) {
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

const styles = StyleSheet.create({
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
  field: {
    gap: 7,
  },
  inputLabel: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.7,
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
  helperText: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
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
    padding: 13,
  },
  favoriteCopy: {
    flex: 1,
    gap: 5,
  },
  colorGroup: {
    gap: 9,
  },
  colorRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  colorSwatch: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    borderColor: "#FFFFFF22",
  },
  selectedSwatch: {
    borderColor: "#F8FAFC",
  },
  pressed: {
    opacity: 0.78,
  },
});
