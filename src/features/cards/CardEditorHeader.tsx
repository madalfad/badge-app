import { StyleSheet } from "react-native";

import { BadgeButton, BadgeTopBar, useBadgeLayout } from "@/components/badge-ui";

type CardEditorHeaderProps = {
  eyebrow: string;
  title: string;
  canSave: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
};

export function CardEditorHeader({
  eyebrow,
  title,
  canSave,
  isSaving,
  onCancel,
  onSave,
}: CardEditorHeaderProps) {
  const layout = useBadgeLayout();

  return (
    <BadgeTopBar
      eyebrow={eyebrow}
      title={title}
      left={
        <BadgeButton
          label="Cancel"
          onPress={onCancel}
          style={styles.headerButton}
          variant="ghost"
        />
      }
      right={
        <BadgeButton
          disabled={!canSave}
          label="Save"
          loading={isSaving}
          onPress={onSave}
          style={styles.headerButton}
          variant="primary"
        />
      }
      style={[
        styles.header,
        { alignSelf: "center", maxWidth: layout.contentMaxWidth, width: "100%" },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#26364F",
  },
  headerButton: {
    minWidth: 74,
    minHeight: 40,
    borderRadius: 999,
  },
});
