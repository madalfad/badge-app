import { StyleSheet, Text, View } from "react-native";

type AppLockRecoveryNoticeProps = {
  compact?: boolean;
};

export function AppLockRecoveryNotice({ compact }: AppLockRecoveryNoticeProps) {
  return (
    <View style={[styles.notice, compact && styles.compactNotice]}>
      <Text style={styles.title}>Forgot your app PIN?</Text>
      <Text style={styles.text}>
        BadgeDeck cannot recover the PIN because it is stored locally in secure
        device storage. If device unlock is unavailable and the PIN is lost,
        remove and reinstall the app to clear the lock. This also removes local
        card data unless you exported or backed it up outside this MVP.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#FBBF2466",
    backgroundColor: "#FBBF2417",
    padding: 13,
    gap: 5,
  },
  compactNotice: {
    marginTop: 2,
  },
  title: {
    color: "#FDE68A",
    fontSize: 12,
    fontWeight: "900",
  },
  text: {
    color: "#FDE68A",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
  },
});
