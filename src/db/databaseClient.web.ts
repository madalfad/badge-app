import type { AppDatabase } from "./types";

export async function getDatabase(): Promise<AppDatabase> {
  throw new Error("SQLite persistence is only enabled on native platforms.");
}
