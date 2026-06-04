import { useCallback, useEffect, useRef, useState } from "react";

import { useDatabaseContext } from "@/db/DatabaseProvider";
import type { AppDatabase } from "@/db/types";

import { emitSettingChange, subscribeToSetting } from "./settingsEvents";

type PersistentSettingUpdater<T> = T | ((currentValue: T) => T);

type PersistentSettingAdapter<T> = {
  deserialize: (value: string) => T;
  serialize: (value: T) => string;
  load: (db: AppDatabase, key: string, fallback: T) => Promise<T>;
  save: (db: AppDatabase, key: string, value: T) => Promise<void>;
};

export function usePersistentSetting<T>(
  key: string,
  fallback: T,
  adapter: PersistentSettingAdapter<T>,
) {
  const { db, isReady } = useDatabaseContext();
  const [value, setValue] = useState(fallback);
  const valueRef = useRef(fallback);
  const [isLoaded, setIsLoaded] = useState(false);

  const updateValue = useCallback((nextValue: T) => {
    valueRef.current = nextValue;
    setValue(nextValue);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToSetting(key, (nextValue) => {
      updateValue(adapter.deserialize(nextValue));
      setIsLoaded(true);
    });

    return unsubscribe;
  }, [adapter, key, updateValue]);

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

      const persistedValue = await adapter.load(db, key, fallback);
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
  }, [adapter, db, fallback, isReady, key, updateValue]);

  const setPersistentValue = useCallback(
    async (nextValueOrUpdater: PersistentSettingUpdater<T>) => {
      const resolvedValue =
        typeof nextValueOrUpdater === "function"
          ? (nextValueOrUpdater as (currentValue: T) => T)(valueRef.current)
          : nextValueOrUpdater;

      updateValue(resolvedValue);
      emitSettingChange(key, adapter.serialize(resolvedValue));

      if (db) {
        await adapter.save(db, key, resolvedValue);
      }
    },
    [adapter, db, key, updateValue],
  );

  return [value, setPersistentValue, isLoaded] as const;
}
