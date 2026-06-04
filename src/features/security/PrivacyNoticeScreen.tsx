import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BadgeButton, BadgePanel, BadgeScrollScreen } from "@/components/badge-ui";

type PrivacyNoticeScreenProps = {
  isSaving?: boolean;
  onAccept: () => void;
};

export function PrivacyNoticeScreen({
  isSaving,
  onAccept,
}: PrivacyNoticeScreenProps) {
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <BadgeScrollScreen contentContainerStyle={styles.content}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>BadgeDeck</Text>
        </View>
        <Text style={styles.title}>Privacy-first local reference cards</Text>
        <Text style={styles.subtitle}>
          BadgeDeck stores imported badge-card images and metadata on this
          device for quick offline access.
        </Text>

        <BadgePanel style={styles.noticeCard}>
          <NoticeItem
            title="Local-only MVP"
            text="Cards are saved in app storage and SQLite on this device. Cloud sync and accounts are not part of this build."
          />
          <NoticeItem
            title="No HIPAA claim"
            text="Do not treat this app as HIPAA-compliant storage. Avoid patient identifiers, PHI, or sensitive screenshots."
          />
          <NoticeItem
            title="Reference only"
            text="Badge cards can become outdated. Verify clinical decisions against your local protocols and reviewed sources."
          />
        </BadgePanel>

        <BadgeButton
          disabled={isSaving}
          label="I understand"
          loading={isSaving}
          onPress={onAccept}
          style={styles.acceptButton}
          variant="primary"
        />
      </BadgeScrollScreen>
    </SafeAreaView>
  );
}

type NoticeItemProps = {
  title: string;
  text: string;
};

function NoticeItem({ title, text }: NoticeItemProps) {
  return (
    <View style={styles.noticeItem}>
      <View style={styles.dot} />
      <View style={styles.noticeCopy}>
        <Text style={styles.noticeTitle}>{title}</Text>
        <Text style={styles.noticeText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#07111F",
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    gap: 20,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2DD4BF66",
    backgroundColor: "#2DD4BF17",
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  badgeText: {
    color: "#99F6E4",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "900",
  },
  subtitle: {
    color: "#CBD5E1",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
  },
  noticeCard: {
    gap: 16,
  },
  noticeItem: {
    flexDirection: "row",
    gap: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2DD4BF",
    marginTop: 5,
  },
  noticeCopy: {
    flex: 1,
    gap: 4,
  },
  noticeTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "900",
  },
  noticeText: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  acceptButton: {
    minHeight: 54,
  },
});
