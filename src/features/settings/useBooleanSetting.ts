import {
  getBooleanSetting,
  setBooleanSetting,
} from "@/db/repositories/settingsRepository";

import { usePersistentSetting } from "./usePersistentSetting";

const booleanSettingAdapter = {
  deserialize: (value: string) => value === "true",
  serialize: (value: boolean) => (value ? "true" : "false"),
  load: getBooleanSetting,
  save: setBooleanSetting,
};

export function useBooleanSetting(key: string, fallback: boolean) {
  return usePersistentSetting(key, fallback, booleanSettingAdapter);
}
