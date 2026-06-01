import type { AppDatabase } from "./types";

export async function getDatabase(): Promise<AppDatabase> {
  throw new Error("SQLite persistence is only enabled on native platforms.");
}

export async function deleteDatabaseForDev() {
  // No-op: local SQLite persistence targets native platforms.
}
