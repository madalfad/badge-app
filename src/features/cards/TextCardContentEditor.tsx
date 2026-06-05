import { Pressable, StyleSheet, Text, View } from "react-native";

import { CardFormField } from "@/features/cards/CardFormField";
import type { BadgeCardSection } from "@/features/cards/types";

export type DraftTextSection = BadgeCardSection & {
  id: string;
};

export type TextSectionPatch = Partial<BadgeCardSection>;

export function createDraftTextSection(): DraftTextSection {
  return {
    id: `section-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    label: "",
    value: "",
  };
}

export function createDraftTextSectionsFromSections(
  sections: BadgeCardSection[],
) {
  if (sections.length === 0) {
    return [createDraftTextSection()];
  }

  return sections.map((section, index) => ({
    id: `section-${index}-${Date.now()}`,
    label: section.label,
    value: section.value,
  }));
}

export function normalizeTextSections(sections: DraftTextSection[]) {
  return sections.flatMap((section, index) => {
    const label = section.label.trim();
    const value = section.value.trim();

    if (!label && !value) {
      return [];
    }

    return [
      {
        label: label && value ? label : `Line ${index + 1}`,
        value: value || label,
      },
    ];
  });
}

type TextCardContentEditorProps = {
  code: string;
  footer: string;
  sections: DraftTextSection[];
  onAddSection: () => void;
  onCodeChange: (value: string) => void;
  onFooterChange: (value: string) => void;
  onRemoveSection: (sectionId: string) => void;
  onUpdateSection: (sectionId: string, patch: TextSectionPatch) => void;
};

export function TextCardContentEditor({
  code,
  footer,
  sections,
  onAddSection,
  onCodeChange,
  onFooterChange,
  onRemoveSection,
  onUpdateSection,
}: TextCardContentEditorProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Text card</Text>
      <CardFormField
        label="Code"
        value={code}
        placeholder="e.g. ED-11"
        onChangeText={onCodeChange}
      />
      <View style={styles.textRows}>
        {sections.map((section, index) => (
          <View key={section.id} style={styles.textRowGroup}>
            <View style={styles.textRowHeader}>
              <Text style={styles.textRowTitle}>Row {index + 1}</Text>
              <ActionButton
                label="Remove"
                disabled={sections.length <= 1}
                onPress={() => onRemoveSection(section.id)}
              />
            </View>
            <CardFormField
              label="Label"
              value={section.label}
              placeholder="e.g. Epinephrine"
              onChangeText={(value) =>
                onUpdateSection(section.id, { label: value })
              }
            />
            <CardFormField
              label="Value"
              value={section.value}
              placeholder="e.g. 1 mg IV/IO q3-5 min"
              multiline
              numberOfLines={3}
              onChangeText={(value) =>
                onUpdateSection(section.id, { value })
              }
            />
          </View>
        ))}
      </View>
      <ActionButton label="Add row" onPress={onAddSection} />
      <CardFormField
        label="Footer"
        value={footer}
        placeholder="Reference note"
        multiline
        numberOfLines={2}
        onChangeText={onFooterChange}
      />
    </View>
  );
}

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

function ActionButton({ label, onPress, disabled }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        disabled && styles.disabledAction,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.actionButtonText, disabled && styles.disabledText]}>
        {label}
      </Text>
    </Pressable>
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
  textRows: {
    gap: 16,
  },
  textRowGroup: {
    borderTopWidth: 1,
    borderTopColor: "#26364F",
    paddingTop: 14,
    gap: 12,
  },
  textRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  textRowTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "900",
  },
  actionButton: {
    borderRadius: 14,
    backgroundColor: "#17243A",
    borderWidth: 1,
    borderColor: "#26364F",
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  actionButtonText: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "900",
  },
  disabledAction: {
    opacity: 0.4,
  },
  disabledText: {
    color: "#94A3B8",
  },
  pressed: {
    opacity: 0.78,
  },
});
