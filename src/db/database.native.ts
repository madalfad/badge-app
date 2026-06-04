import * as SQLite from "expo-sqlite";

import { migrateDbIfNeeded } from "./migrations";
import type { AppDatabase } from "./types";

const DATABASE_NAME = "badgedeck.db";

let databasePromise: Promise<AppDatabase> | null = null;

export function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME).then(
      async (db) => {
        await migrateDbIfNeeded(db);
        return db;
      },
    );
  }

  return databasePromise;
}
