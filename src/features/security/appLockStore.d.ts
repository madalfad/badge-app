export type DeviceAuthAvailability = {
  isAvailable: boolean;
  label: string;
  detail: string;
};

export function getStoredAppLockPin(): Promise<string | null>;
export function setStoredAppLockPin(pin: string): Promise<void>;
export function clearStoredAppLockPin(): Promise<void>;
export function getDeviceAuthAvailability(): Promise<DeviceAuthAvailability>;
export function authenticateWithDevice(): Promise<boolean>;
