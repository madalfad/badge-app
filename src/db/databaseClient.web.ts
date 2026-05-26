import type { AppDatabase } from './types';

export async function getDatabase(): Promise<AppDatabase> {
  throw new Error('SQLite persistence is only enabled on native platforms in this milestone.');
}

export async function deleteDatabaseForDev() {
  // No-op: the milestone 2 SQLite implementation targets native platforms.
}
