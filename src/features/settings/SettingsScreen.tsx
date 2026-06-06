import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";

import { BadgeBottomNav } from "@/components/BadgeBottomNav";
import {
  BadgeButton,
  BadgeTopBar,
  useBadgeLayout,
} from "@/components/badge-ui";
import { useDatabaseContext } from "@/db/DatabaseProvider";
import {
  pickAndRestoreBadgeDeckBackup,
  shareBadgeDeckBackup,
} from "@/features/backup/backupService";
import { AppLockRecoveryNotice } from "@/features/security/AppLockRecoveryNotice";
import { useDeviceAuthAvailability } from "@/features/security/useDeviceAuthAvailability";
import { subscribeToTabReset } from "@/navigation/tabResetEvents";

import { useBooleanSetting } from "./useBooleanSetting";
import { useStringSetting } from "./useStringSetting";
import {
  clearStoredAppLockPin,
  setStoredAppLockPin,
} from "@/features/security/appLockStore";

const TIMEOUT_OPTIONS = [
  { label: "Immediate", value: "0" },
  { label: "5 min", value: "5" },
  { label: "15 min", value: "15" },
];

export function SettingsScreen() {
  const router = useRouter();
  const layout = useBadgeLayout();
  const { db } = useDatabaseContext();
  const scrollRef = useRef<ScrollView>(null);
  const [privacyAccepted, setPrivacyAccepted] = useBooleanSetting(
    "privacy_notice_accepted",
    false,
  );
  const [appLockEnabled, setAppLockEnabled] = useBooleanSetting(
    "app_lock_enabled",
    false,
  );
  const [timeoutMinutes, setTimeoutMinutes] = useStringSetting(
    "app_lock_timeout_minutes",
    "5",
  );
  const [reduceMotion, setReduceMotion] = useBooleanSetting(
    "reduce_motion_enabled",
    false,
  );
  const [hapticsEnabled, setHapticsEnabled] = useBooleanSetting(
    "haptics_enabled",
    true,
  );
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [isSavingLock, setIsSavingLock] = useState(false);
  const [backupAction, setBackupAction] = useState<"export" | "restore" | null>(
    null,
  );
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const deviceAuth = useDeviceAuthAvailability();

  useFocusEffect(
    useCallback(
      () =>
        subscribeToTabReset("/settings", () => {
          scrollRef.current?.scrollTo({ y: 0, animated: true });
        }),
      [],
    ),
  );

  const enableAppLock = async () => {
    setSecurityError(null);

    if (process.env.EXPO_OS === "web") {
      setSecurityError(
        "App lock secure storage is available in native builds.",
      );
      return;
    }

    if (pin.length < 4) {
      setSecurityError("Use at least 4 digits for the app lock PIN.");
      return;
    }

    if (pin !== confirmPin) {
      setSecurityError("PIN entries do not match.");
      setConfirmPin("");
      return;
    }

    setIsSavingLock(true);
    try {
      await setStoredAppLockPin(pin);
      await setAppLockEnabled(true);
      setPin("");
      setConfirmPin("");
    } catch (caughtError) {
      setSecurityError(
        caughtError instanceof Error
          ? caughtError.message
          : "App lock could not be enabled.",
      );
    } finally {
      setIsSavingLock(false);
    }
  };

  const disableAppLock = () => {
    Alert.alert(
      "Disable app lock?",
      "BadgeDeck will stop asking for this app PIN on launch and after the timeout.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disable",
          style: "destructive",
          onPress: async () => {
            setIsSavingLock(true);
            setSecurityError(null);
            try {
              await clearStoredAppLockPin();
              await setAppLockEnabled(false);
            } catch (caughtError) {
              setSecurityError(
                caughtError instanceof Error
                  ? caughtError.message
                  : "App lock could not be disabled.",
              );
            } finally {
              setIsSavingLock(false);
            }
          },
        },
      ],
    );
  };

  const exportBackup = async () => {
    if (!db) {
      setBackupStatus("Native storage is required to export a backup.");
      return;
    }

    setBackupAction("export");
    setBackupStatus(null);
    try {
      const result = await shareBadgeDeckBackup(db);
      setBackupStatus(
        `Exported ${result.cardCount} cards and ${result.reelCount} reels.`,
      );
    } catch (caughtError) {
      setBackupStatus(
        caughtError instanceof Error
          ? caughtError.message
          : "Backup export failed.",
      );
    } finally {
      setBackupAction(null);
    }
  };

  const restoreBackup = async () => {
    if (!db) {
      setBackupStatus("Native storage is required to restore a backup.");
      return;
    }

    setBackupAction("restore");
    setBackupStatus(null);
    try {
      const result = await pickAndRestoreBadgeDeckBackup(db);
      if (!result) {
        setBackupStatus("Restore cancelled.");
        return;
      }

      setBackupStatus(
        `Restored ${result.cardCount} cards and ${result.reelCount} reels.`,
      );
    } catch (caughtError) {
      setBackupStatus(
        caughtError instanceof Error
          ? caughtError.message
          : "Backup restore failed.",
      );
    } finally {
      setBackupAction(null);
    }
  };

  const confirmRestoreBackup = () => {
    Alert.alert(
      "Restore backup?",
      "This replaces the local card library, reels, tags, and app settings with the selected .badgedeck file. App lock will be disabled because the secure PIN is device-local.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          style: "destructive",
          onPress: () => {
            restoreBackup().catch(() => undefined);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <BadgeTopBar
        eyebrow="Settings"
        title="Security & polish"
        left={
          <BadgeButton
            label="Back"
            onPress={() => router.back()}
            style={styles.headerButton}
            variant="ghost"
          />
        }
        right={<View style={styles.headerSpacer} />}
        style={[
          styles.header,
          {
            alignSelf: "center",
            maxWidth: layout.contentMaxWidth,
            width: "100%",
          },
        ]}
      />

      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          {
            alignSelf: "center",
            maxWidth: layout.contentMaxWidth,
            paddingHorizontal: layout.gutter,
            width: "100%",
          },
        ]}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy notice</Text>
          <Text style={styles.sectionText}>
            BadgeDeck is a local-only MVP and does not claim HIPAA compliance.
            Avoid importing patient identifiers, PHI, or sensitive screenshots.
          </Text>
          <SettingRow
            title="Privacy notice accepted"
            text={privacyAccepted ? "Accepted" : "Will show on next launch"}
            value={privacyAccepted}
            onValueChange={setPrivacyAccepted}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderCopy}>
              <Text style={styles.sectionTitle}>Backup & restore</Text>
              <Text style={styles.sectionText}>
                Export or restore a versioned .badgedeck file with cards, reels,
                tags, settings, and local images.
              </Text>
            </View>
            {backupAction ? <ActivityIndicator color="#2DD4BF" /> : null}
          </View>
          <View style={styles.backupActions}>
            <Pressable
              accessibilityRole="button"
              disabled={Boolean(backupAction)}
              onPress={exportBackup}
              style={({ pressed }) => [
                styles.primaryButton,
                styles.backupButton,
                backupAction && styles.disabledButton,
                pressed && !backupAction && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {backupAction === "export" ? "Exporting..." : "Export backup"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={Boolean(backupAction)}
              onPress={confirmRestoreBackup}
              style={({ pressed }) => [
                styles.dangerButton,
                styles.backupButton,
                backupAction && styles.disabledButton,
                pressed && !backupAction && styles.pressed,
              ]}
            >
              <Text style={styles.dangerButtonText}>
                {backupAction === "restore" ? "Restoring..." : "Restore backup"}
              </Text>
            </Pressable>
          </View>
          {backupStatus ? (
            <Text style={styles.backupStatusText}>{backupStatus}</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderCopy}>
              <Text style={styles.sectionTitle}>App lock</Text>
              <Text style={styles.sectionText}>
                Protect quick access with a local app PIN stored in SecureStore.
                Device unlock is offered when available.
              </Text>
            </View>
            {isSavingLock ? <ActivityIndicator color="#2DD4BF" /> : null}
          </View>

          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>
              {appLockEnabled ? "Enabled" : "Disabled"}
            </Text>
          </View>

          {appLockEnabled ? (
            <Pressable
              accessibilityRole="button"
              disabled={isSavingLock}
              onPress={disableAppLock}
              style={({ pressed }) => [
                styles.dangerButton,
                isSavingLock && styles.disabledButton,
                pressed && !isSavingLock && styles.pressed,
              ]}
            >
              <Text style={styles.dangerButtonText}>Disable app lock</Text>
            </Pressable>
          ) : (
            <View style={styles.pinForm}>
              <PinInput
                label="New PIN"
                value={pin}
                onChangeText={setPin}
                placeholder="4+ digits"
              />
              <PinInput
                label="Confirm PIN"
                value={confirmPin}
                onChangeText={setConfirmPin}
                placeholder="Repeat PIN"
              />
              {securityError ? (
                <Text style={styles.errorText}>{securityError}</Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                disabled={isSavingLock}
                onPress={enableAppLock}
                style={({ pressed }) => [
                  styles.primaryButton,
                  isSavingLock && styles.disabledButton,
                  pressed && !isSavingLock && styles.pressed,
                ]}
              >
                {isSavingLock ? (
                  <ActivityIndicator color="#04111F" />
                ) : (
                  <Text style={styles.primaryButtonText}>Enable app lock</Text>
                )}
              </Pressable>
            </View>
          )}

          <View style={styles.timeoutGroup}>
            <Text style={styles.inputLabel}>Lock after background</Text>
            <View style={styles.segmentRow}>
              {TIMEOUT_OPTIONS.map((option) => (
                <SegmentButton
                  key={option.value}
                  label={option.label}
                  selected={timeoutMinutes === option.value}
                  disabled={!appLockEnabled}
                  onPress={() => setTimeoutMinutes(option.value)}
                />
              ))}
            </View>
          </View>

          <View style={styles.deviceAuthBox}>
            <Text style={styles.deviceAuthTitle}>
              {deviceAuth?.label ?? "Device unlock"}
            </Text>
            <Text style={styles.deviceAuthText}>
              {deviceAuth?.detail ?? "Checking device authentication support…"}
            </Text>
          </View>

          <AppLockRecoveryNotice />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interaction</Text>
          <SettingRow
            title="Haptics"
            text="Use subtle feedback when favoriting cards and spinning the reel."
            value={hapticsEnabled}
            onValueChange={setHapticsEnabled}
          />
          <SettingRow
            title="Reduced motion"
            text="Prefer calmer reel motion and less depth animation."
            value={reduceMotion}
            onValueChange={setReduceMotion}
          />
        </View>
      </ScrollView>
      <BadgeBottomNav />
    </SafeAreaView>
  );
}

type PinInputProps = {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
};

function PinInput({ label, value, placeholder, onChangeText }: PinInputProps) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor="#64748B"
        keyboardType="number-pad"
        maxLength={12}
        secureTextEntry
        onChangeText={(nextValue) => onChangeText(nextValue.replace(/\D/g, ""))}
        style={styles.input}
      />
    </View>
  );
}

type SettingRowProps = {
  title: string;
  text: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

function SettingRow({ title, text, value, onValueChange }: SettingRowProps) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingText}>{text}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

type SegmentButtonProps = {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
};

function SegmentButton({
  label,
  selected,
  disabled,
  onPress,
}: SegmentButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.segmentButton,
        selected && styles.segmentButtonSelected,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.segmentText,
          selected && styles.segmentTextSelected,
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#17243A",
  },
  headerButton: {
    minWidth: 76,
    borderRadius: 16,
    backgroundColor: "#17243A",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  headerButtonText: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "900",
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: "center",
  },
  headerSpacer: {
    width: 76,
  },
  eyebrow: {
    color: "#2DD4BF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  headerTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 3,
  },
  content: {
    padding: 16,
    paddingBottom: 34,
    gap: 16,
  },
  section: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#26364F",
    backgroundColor: "#101C2E",
    padding: 16,
    gap: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: 7,
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "900",
  },
  sectionText: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2DD4BF66",
    backgroundColor: "#2DD4BF17",
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  statusPillText: {
    color: "#99F6E4",
    fontSize: 12,
    fontWeight: "900",
  },
  pinForm: {
    gap: 12,
  },
  inputGroup: {
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
    fontSize: 18,
    fontWeight: "900",
    paddingHorizontal: 14,
    letterSpacing: 3,
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 12,
    fontWeight: "800",
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2DD4BF",
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: "#04111F",
    fontSize: 13,
    fontWeight: "900",
  },
  backupActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  backupButton: {
    alignSelf: "stretch",
    flexBasis: 150,
    flexGrow: 1,
  },
  backupStatusText: {
    color: "#CBD5E1",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
  },
  dangerButton: {
    alignSelf: "flex-start",
    minHeight: 44,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#F8717166",
    backgroundColor: "#F871711F",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  dangerButtonText: {
    color: "#FCA5A5",
    fontSize: 13,
    fontWeight: "900",
  },
  timeoutGroup: {
    gap: 9,
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  segmentButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#26364F",
    backgroundColor: "#17243A",
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  segmentButtonSelected: {
    borderColor: "#2DD4BF99",
    backgroundColor: "#2DD4BF22",
  },
  segmentText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "900",
  },
  segmentTextSelected: {
    color: "#F8FAFC",
  },
  deviceAuthBox: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#26364F",
    backgroundColor: "#07111F",
    padding: 13,
    gap: 4,
  },
  deviceAuthTitle: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "900",
  },
  deviceAuthText: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  settingRow: {
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
  settingCopy: {
    flex: 1,
    gap: 4,
  },
  settingTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "900",
  },
  settingText: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.45,
  },
  disabledText: {
    color: "#64748B",
  },
  pressed: {
    opacity: 0.78,
  },
});
