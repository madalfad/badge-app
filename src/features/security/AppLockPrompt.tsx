import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  BadgeButton,
  BadgePanel,
  BadgeScrollScreen,
  BadgeTextField,
} from "@/components/badge-ui";
import { AppLockRecoveryNotice } from "./AppLockRecoveryNotice";
import { authenticateWithDevice } from "./appLockStore";
import { useDeviceAuthAvailability } from "./useDeviceAuthAvailability";

type AppLockPromptProps = {
  storedPin: string;
  onUnlock: () => void;
};

export function AppLockPrompt({ storedPin, onUnlock }: AppLockPromptProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCheckingDevice, setIsCheckingDevice] = useState(false);
  const deviceAuth = useDeviceAuthAvailability();

  const handleUnlock = () => {
    if (pin === storedPin) {
      setError(null);
      setPin("");
      onUnlock();
      return;
    }

    setError("Incorrect PIN. Try again.");
    setPin("");
  };

  const handleDeviceUnlock = async () => {
    setIsCheckingDevice(true);
    setError(null);
    try {
      const didAuthenticate = await authenticateWithDevice();
      if (didAuthenticate) {
        onUnlock();
        return;
      }
      setError("Device unlock was canceled or failed.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Device unlock is unavailable right now.",
      );
    } finally {
      setIsCheckingDevice(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <BadgeScrollScreen contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>App lock</Text>
        <Text style={styles.title}>Unlock BadgeDeck</Text>
        <Text style={styles.subtitle}>
          App lock protects quick access to your local card library on this
          device. It is not a substitute for device encryption or clinical data
          governance.
        </Text>

        <BadgePanel style={styles.card}>
          <Text style={styles.inputLabel}>PIN</Text>
          <BadgeTextField
            value={pin}
            autoFocus
            keyboardType="number-pad"
            maxLength={12}
            placeholder="Enter app lock PIN"
            placeholderTextColor="#64748B"
            secureTextEntry
            onChangeText={(nextValue) => {
              setError(null);
              setPin(nextValue.replace(/\D/g, ""));
            }}
            onSubmitEditing={handleUnlock}
            style={styles.input}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <BadgeButton
            disabled={pin.length === 0}
            label="Unlock"
            onPress={handleUnlock}
            style={styles.primaryButton}
            variant="primary"
          />

          {deviceAuth?.isAvailable ? (
            <BadgeButton
              disabled={isCheckingDevice}
              label={`Use ${deviceAuth.label}`}
              loading={isCheckingDevice}
              onPress={handleDeviceUnlock}
              style={styles.secondaryButton}
            />
          ) : (
            <Text style={styles.deviceHint}>
              {deviceAuth?.detail ?? "Checking device unlock support…"}
            </Text>
          )}

          <AppLockRecoveryNotice compact />
        </BadgePanel>
      </BadgeScrollScreen>
    </SafeAreaView>
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
    gap: 10,
  },
  eyebrow: {
    color: "#2DD4BF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "900",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
    marginTop: 4,
  },
  card: {
    marginTop: 12,
    gap: 12,
  },
  inputLabel: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  input: {
    minHeight: 52,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 4,
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 12,
    fontWeight: "800",
  },
  primaryButton: {
    minHeight: 50,
  },
  secondaryButton: {
    minHeight: 50,
  },
  deviceHint: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
});
