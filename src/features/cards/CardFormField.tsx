import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native";

import { BadgeTextField, badgeColors } from "@/components/badge-ui";

type CardFormFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  inputStyle?: StyleProp<TextStyle>;
  multiline?: boolean;
  numberOfLines?: number;
  onChangeText: (value: string) => void;
};

export function CardFormField({
  inputStyle,
  label,
  multiline,
  numberOfLines,
  value,
  placeholder,
  onChangeText,
}: CardFormFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.inputLabel}>{label}</Text>
      <BadgeTextField
        multiline={multiline}
        numberOfLines={numberOfLines}
        value={value}
        placeholder={placeholder}
        textAlignVertical={multiline ? "top" : "center"}
        onChangeText={onChangeText}
        style={[styles.input, multiline && styles.multilineInput, inputStyle]}
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
  multilineInput: {
    minHeight: 92,
    paddingTop: 13,
  },
});
