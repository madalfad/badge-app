import { StyleSheet, Text, View } from "react-native";

import { BadgeTextField, badgeColors } from "@/components/badge-ui";

type CardFormFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
};

export function CardFormField({
  label,
  value,
  placeholder,
  onChangeText,
}: CardFormFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.inputLabel}>{label}</Text>
      <BadgeTextField
        value={value}
        placeholder={placeholder}
        onChangeText={onChangeText}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 8,
  },
  inputLabel: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: badgeColors.inputBg,
    borderColor: badgeColors.border,
    fontSize: 15,
  },
});
