import { StyleSheet, View } from "react-native";

import { BadgeNotice } from "@/components/badge-ui";

type AppLockRecoveryNoticeProps = {
  compact?: boolean;
};

export function AppLockRecoveryNotice({ compact }: AppLockRecoveryNoticeProps) {
  return (
    <View style={[styles.notice, compact && styles.compactNotice]}>
      <BadgeNotice
        text="BadgeDeck cannot recover the PIN because it is stored locally in secure device storage. If device unlock is unavailable and the PIN is lost, remove and reinstall the app to clear the lock. This also removes local card data unless you exported or backed it up outside this MVP."
        title="Forgot your app PIN?"
        tone="warning"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
  },
  compactNotice: {
    marginTop: 2,
  },
});
