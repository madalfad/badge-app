import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLockRecoveryNotice } from "./AppLockRecoveryNotice";
import {
  authenticateWithDevice,
  getDeviceAuthAvailability,
  type DeviceAuthAvailability,
} from "./appLockStore";

type AppLockPromptProps = {
  storedPin: string;
  onUnlock: () => void;
};

export function AppLockPrompt({ storedPin, onUnlock }: AppLockPromptProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCheckingDevice, setIsCheckingDevice] = useState(false);
  const [deviceAuth, setDeviceAuth] = useState<DeviceAuthAvailability | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;

    getDeviceAuthAvailability()
      .then((availability) => {
        if (isMounted) {
          setDeviceAuth(availability);
        }
      })
      .catch(() => {
        if (isMounted) {
          setDeviceAuth({
            isAvailable: false,
            label: "Device unlock",
            detail: "Device authentication is unavailable right now.",
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
      <View style={styles.content}>
        <Text style={styles.eyebrow}>App lock</Text>
        <Text style={styles.title}>Unlock BadgeDeck</Text>
        <Text style={styles.subtitle}>
          App lock protects quick access to your local card library on this
          device. It is not a substitute for device encryption or clinical data
          governance.
        </Text>

        <View style={styles.card}>
          <Text style={styles.inputLabel}>PIN</Text>
          <TextInput
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
          <Pressable
            accessibilityRole="button"
            disabled={pin.length === 0}
            onPress={handleUnlock}
            style={({ pressed }) => [
              styles.primaryButton,
              pin.length === 0 && styles.disabledButton,
              pressed && pin.length > 0 && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Unlock</Text>
          </Pressable>

          {deviceAuth?.isAvailable ? (
            <Pressable
              accessibilityRole="button"
              disabled={isCheckingDevice}
              onPress={handleDeviceUnlock}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && !isCheckingDevice && styles.pressed,
              ]}
            >
              {isCheckingDevice ? (
                <ActivityIndicator color="#F8FAFC" />
              ) : (
                <Text style={styles.secondaryButtonText}>
                  Use {deviceAuth.label}
                </Text>
              )}
            </Pressable>
          ) : (
            <Text style={styles.deviceHint}>
              {deviceAuth?.detail ?? "Checking device unlock support…"}
            </Text>
          )}

          <AppLockRecoveryNotice compact />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#07111F",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
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
    letterSpacing: -1,
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
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#26364F",
    backgroundColor: "#101C2E",
    padding: 16,
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
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#26364F",
    backgroundColor: "#07111F",
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "900",
    paddingHorizontal: 14,
    letterSpacing: 4,
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 12,
    fontWeight: "800",
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2DD4BF",
  },
  primaryButtonText: {
    color: "#04111F",
    fontSize: 14,
    fontWeight: "900",
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#26364F",
    backgroundColor: "#17243A",
  },
  secondaryButtonText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "900",
  },
  deviceHint: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.78,
  },
});
