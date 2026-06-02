import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, AppState, StyleSheet, Text, View } from "react-native";

import { useBooleanSetting } from "@/features/settings/useBooleanSetting";
import { useStringSetting } from "@/features/settings/useStringSetting";

import { AppLockPrompt } from "./AppLockPrompt";
import { getStoredAppLockPin } from "./appLockStore";
import { PrivacyNoticeScreen } from "./PrivacyNoticeScreen";

type SecurityGateProps = {
  children: ReactNode;
};

function parseTimeoutMinutes(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 5;
}

export function SecurityGate({ children }: SecurityGateProps) {
  const [privacyAccepted, setPrivacyAccepted, privacyLoaded] =
    useBooleanSetting("privacy_notice_accepted", false);
  const [appLockEnabled, , appLockLoaded] = useBooleanSetting(
    "app_lock_enabled",
    false,
  );
  const [timeoutMinutes] = useStringSetting("app_lock_timeout_minutes", "5");
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [isPinLoaded, setIsPinLoaded] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isAcceptingPrivacy, setIsAcceptingPrivacy] = useState(false);
  const inactiveAtRef = useRef<number | null>(null);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    let isMounted = true;

    async function loadPin() {
      if (!appLockLoaded) {
        return;
      }

      if (!appLockEnabled) {
        if (isMounted) {
          setStoredPin(null);
          setIsUnlocked(true);
          setIsPinLoaded(true);
        }
        return;
      }

      setIsPinLoaded(false);
      try {
        const pin = await getStoredAppLockPin();
        if (isMounted) {
          setStoredPin(pin);
          setIsUnlocked(!pin);
          setIsPinLoaded(true);
        }
      } catch {
        if (isMounted) {
          setStoredPin(null);
          setIsUnlocked(true);
          setIsPinLoaded(true);
        }
      }
    }

    loadPin();

    return () => {
      isMounted = false;
    };
  }, [appLockEnabled, appLockLoaded]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (nextAppState === "inactive" || nextAppState === "background") {
        inactiveAtRef.current = Date.now();
        return;
      }

      if (
        nextAppState === "active" &&
        previousAppState !== "active" &&
        appLockEnabled &&
        storedPin
      ) {
        const timeoutMs = parseTimeoutMinutes(timeoutMinutes) * 60 * 1000;
        const inactiveAt = inactiveAtRef.current;
        const shouldLock =
          timeoutMs === 0 ||
          (typeof inactiveAt === "number" && Date.now() - inactiveAt >= timeoutMs);

        if (shouldLock) {
          setIsUnlocked(false);
        }
      }
    });

    return () => subscription.remove();
  }, [appLockEnabled, storedPin, timeoutMinutes]);

  const acceptPrivacyNotice = useCallback(async () => {
    setIsAcceptingPrivacy(true);
    try {
      await setPrivacyAccepted(true);
    } finally {
      setIsAcceptingPrivacy(false);
    }
  }, [setPrivacyAccepted]);

  if (!privacyLoaded || !appLockLoaded || !isPinLoaded) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#2DD4BF" />
        <Text style={styles.loadingText}>Preparing BadgeDeck…</Text>
      </View>
    );
  }

  if (!privacyAccepted) {
    return (
      <PrivacyNoticeScreen
        isSaving={isAcceptingPrivacy}
        onAccept={acceptPrivacyNotice}
      />
    );
  }

  if (appLockEnabled && storedPin && !isUnlocked) {
    return (
      <AppLockPrompt storedPin={storedPin} onUnlock={() => setIsUnlocked(true)} />
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#07111F",
    padding: 24,
  },
  loadingText: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 12,
  },
});
