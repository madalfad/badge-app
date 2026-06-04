import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BadgeButton, badgeColors } from "@/components/badge-ui";

type CardLoadingStateProps = {
  message: string;
};

export function CardLoadingState({ message }: CardLoadingStateProps) {
  return (
    <View style={styles.centeredState}>
      <ActivityIndicator color="#2DD4BF" />
      <Text style={styles.centeredStateText}>{message}</Text>
    </View>
  );
}

type CardUnavailableStateProps = {
  message: string;
  onBackToReel: () => void;
};

export function CardUnavailableState({
  message,
  onBackToReel,
}: CardUnavailableStateProps) {
  return (
    <SafeAreaView style={styles.centeredState}>
      <Text style={styles.errorTitle}>Card unavailable</Text>
      <Text style={styles.errorText}>{message}</Text>
      <BadgeButton label="Back to reel" onPress={onBackToReel} variant="primary" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centeredState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: badgeColors.bg,
    padding: 24,
  },
  centeredStateText: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 12,
  },
  errorTitle: {
    color: badgeColors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  errorText: {
    color: badgeColors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 18,
  },
});
