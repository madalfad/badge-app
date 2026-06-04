import { getSetting, setSetting } from "@/db/repositories/settingsRepository";

import { usePersistentSetting } from "./usePersistentSetting";

const stringSettingAdapter = {
  deserialize: (value: string) => value,
  serialize: (value: string) => value,
  load: async (db, key, fallback) => (await getSetting(db, key)) ?? fallback,
  save: setSetting,
} satisfies Parameters<typeof usePersistentSetting<string>>[2];

export function useStringSetting(key: string, fallback: string) {
  return usePersistentSetting(key, fallback, stringSettingAdapter);
}
