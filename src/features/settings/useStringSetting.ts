import { useCallback, useEffect, useRef, useState } from "react";

import { useDatabaseContext } from "@/db/DatabaseProvider";
import { getSetting, setSetting } from "@/db/repositories/settingsRepository";

import { emitSettingChange, subscribeToSetting } from "./settingsEvents";

type StringSettingUpdater = string | ((currentValue: string) => string);

export function useStringSetting(key: string, fallback: string) {
  const { db, isReady } = useDatabaseContext();
  const [value, setValue] = useState(fallback);
  const valueRef = useRef(fallback);
  const [isLoaded, setIsLoaded] = useState(false);

  const updateValue = useCallback((nextValue: string) => {
    valueRef.current = nextValue;
    setValue(nextValue);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToSetting(key, (nextValue) => {
      updateValue(nextValue);
      setIsLoaded(true);
    });

    return unsubscribe;
  }, [key, updateValue]);

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

      const persistedValue = await getSetting(db, key);
      if (isMounted) {
        updateValue(persistedValue ?? fallback);
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
    async (nextValueOrUpdater: StringSettingUpdater) => {
      const resolvedValue =
        typeof nextValueOrUpdater === "function"
          ? nextValueOrUpdater(valueRef.current)
          : nextValueOrUpdater;

      updateValue(resolvedValue);
      emitSettingChange(key, resolvedValue);

      if (db) {
        await setSetting(db, key, resolvedValue);
      }
    },
    [db, key, updateValue],
  );

  return [value, setPersistentValue, isLoaded] as const;
}
