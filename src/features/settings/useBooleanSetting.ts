import { useCallback, useEffect, useRef, useState } from "react";

import { useDatabaseContext } from "@/db/DatabaseProvider";
import {
  getBooleanSetting,
  setBooleanSetting,
} from "@/db/repositories/settingsRepository";

type BooleanSettingUpdater = boolean | ((currentValue: boolean) => boolean);

export function useBooleanSetting(key: string, fallback: boolean) {
  const { db, isReady } = useDatabaseContext();
  const [value, setValue] = useState(fallback);
  const valueRef = useRef(fallback);
  const [isLoaded, setIsLoaded] = useState(false);

  const updateValue = useCallback((nextValue: boolean) => {
    valueRef.current = nextValue;
    setValue(nextValue);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSetting() {
      if (!isReady) {
        return;
      }

      if (!db) {
        updateValue(fallback);
        setIsLoaded(true);
        return;
      }

      const persistedValue = await getBooleanSetting(db, key, fallback);
      if (isMounted) {
        updateValue(persistedValue);
        setIsLoaded(true);
      }
    }

    loadSetting().catch(() => {
      if (isMounted) {
        updateValue(fallback);
        setIsLoaded(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [db, fallback, isReady, key, updateValue]);

  const setPersistentValue = useCallback(
    async (nextValueOrUpdater: BooleanSettingUpdater) => {
      const resolvedValue =
        typeof nextValueOrUpdater === "function"
          ? nextValueOrUpdater(valueRef.current)
          : nextValueOrUpdater;

      updateValue(resolvedValue);

      if (db) {
        await setBooleanSetting(db, key, resolvedValue);
      }
    },
    [db, key, updateValue],
  );

  return [value, setPersistentValue, isLoaded] as const;
}
