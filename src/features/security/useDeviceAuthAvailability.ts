import { useEffect, useState } from "react";

import {
  getDeviceAuthAvailability,
  type DeviceAuthAvailability,
} from "./appLockStore";

const unavailableDeviceAuth: DeviceAuthAvailability = {
  isAvailable: false,
  label: "Device unlock",
  detail: "Device authentication is unavailable right now.",
};

export function useDeviceAuthAvailability() {
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
          setDeviceAuth(unavailableDeviceAuth);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return deviceAuth;
}
