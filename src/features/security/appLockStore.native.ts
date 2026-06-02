import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

import type { DeviceAuthAvailability } from "./appLockStore";

const APP_LOCK_PIN_KEY = "badgedeck.app_lock_pin";

async function assertSecureStoreAvailable() {
  const isAvailable = await SecureStore.isAvailableAsync();
  if (!isAvailable) {
    throw new Error("Secure storage is not available on this device.");
  }
}

function getDeviceAuthLabel(types: LocalAuthentication.AuthenticationType[]) {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return "Face ID / face unlock";
  }

  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return "Fingerprint";
  }

  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return "Iris unlock";
  }

  return "Device unlock";
}

export async function getStoredAppLockPin() {
  const isAvailable = await SecureStore.isAvailableAsync();
  if (!isAvailable) {
    return null;
  }

  return SecureStore.getItemAsync(APP_LOCK_PIN_KEY, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function setStoredAppLockPin(pin: string) {
  await assertSecureStoreAvailable();
  await SecureStore.setItemAsync(APP_LOCK_PIN_KEY, pin, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearStoredAppLockPin() {
  const isAvailable = await SecureStore.isAvailableAsync();
  if (!isAvailable) {
    return;
  }

  await SecureStore.deleteItemAsync(APP_LOCK_PIN_KEY, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getDeviceAuthAvailability(): Promise<DeviceAuthAvailability> {
  const [hasHardware, isEnrolled, types] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
  ]);

  if (!hasHardware) {
    return {
      isAvailable: false,
      label: "Device unlock",
      detail: "This device does not report biometric hardware.",
    };
  }

  if (!isEnrolled) {
    return {
      isAvailable: false,
      label: getDeviceAuthLabel(types),
      detail: "Set up Face ID, fingerprint, or device passcode first.",
    };
  }

  return {
    isAvailable: true,
    label: getDeviceAuthLabel(types),
    detail: "Available for quick unlock on this device.",
  };
}

export async function authenticateWithDevice() {
  const availability = await getDeviceAuthAvailability();
  if (!availability.isAvailable) {
    return false;
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Unlock BadgeDeck",
    promptDescription: "Confirm this is you to view your badge card library.",
    promptSubtitle: "App lock is enabled",
    fallbackLabel: "Use device passcode",
    cancelLabel: "Cancel",
    disableDeviceFallback: false,
  });

  return result.success;
}
