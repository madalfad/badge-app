import { nowIso } from '@/utils/dates';

import type { AppDatabase } from '../types';

type SettingRow = {
  value: string;
};

export async function getSetting(db: AppDatabase, key: string) {
  const row = await db.getFirstAsync<SettingRow>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setSetting(db: AppDatabase, key: string, value: string) {
  await db.runAsync(
    `INSERT INTO settings (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at`,
    key,
    value,
    nowIso(),
  );
}

export async function getBooleanSetting(db: AppDatabase, key: string, fallback = false) {
  const value = await getSetting(db, key);
  if (value === null) {
    return fallback;
  }
  return value === 'true';
}

export async function setBooleanSetting(db: AppDatabase, key: string, value: boolean) {
  await setSetting(db, key, value ? 'true' : 'false');
}
