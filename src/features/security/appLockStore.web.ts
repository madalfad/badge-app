import type { DeviceAuthAvailability } from "./appLockStore";

export async function getStoredAppLockPin() {
  return null;
}

export async function setStoredAppLockPin() {
  throw new Error("App lock secure storage is only available in native builds.");
}

export async function clearStoredAppLockPin() {
  // No-op for static web/demo builds.
}

export async function getDeviceAuthAvailability(): Promise<DeviceAuthAvailability> {
  return {
    isAvailable: false,
    label: "Device unlock",
    detail: "Device authentication is available in native builds only.",
  };
}

export async function authenticateWithDevice() {
  return false;
}
