import {
  DEFAULT_REEL_COLOR,
  DEFAULT_REEL_ICON,
  DEFAULT_REEL_ID,
  DEFAULT_REEL_NAME,
} from "@/features/reels/constants";
import { nowIso } from "@/utils/dates";

import type { AppDatabase } from "./types";

const DATABASE_VERSION = 2;

export async function migrateDbIfNeeded(db: AppDatabase) {
  await db.execAsync("PRAGMA foreign_keys = ON");

  const versionRow = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentVersion === 0) {
    await db.execAsync(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  category_id TEXT,
  primary_color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  review_date TEXT,
  source_type TEXT NOT NULL DEFAULT 'user_image',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_viewed_at TEXT,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS card_assets (
  id TEXT PRIMARY KEY NOT NULL,
  card_id TEXT NOT NULL,
  side TEXT NOT NULL,
  file_uri TEXT NOT NULL,
  thumbnail_uri TEXT NOT NULL,
  display_uri TEXT,
  mime_type TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  thumbnail_width INTEGER NOT NULL,
  thumbnail_height INTEGER NOT NULL,
  file_size INTEGER,
  thumbhash TEXT,
  ocr_text TEXT,
  crop_data_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS card_tags (
  card_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (card_id, tag_id),
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cards_category ON cards(category_id);
CREATE INDEX IF NOT EXISTS idx_cards_favorite ON cards(is_favorite);
CREATE INDEX IF NOT EXISTS idx_cards_archived ON cards(is_archived);
CREATE INDEX IF NOT EXISTS idx_cards_sort_order ON cards(sort_order);
CREATE INDEX IF NOT EXISTS idx_card_assets_card_id ON card_assets(card_id);
CREATE INDEX IF NOT EXISTS idx_card_assets_side ON card_assets(card_id, side);
CREATE INDEX IF NOT EXISTS idx_card_tags_tag_id ON card_tags(tag_id);
`);
  }

  if (currentVersion < 2) {
    await createReelTables(db);
    await ensureDefaultReel(db);
    await backfillDefaultReel(db);
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

async function createReelTables(db: AppDatabase) {
  await db.execAsync(`
CREATE TABLE IF NOT EXISTS reels (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reel_cards (
  reel_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  added_at TEXT NOT NULL,
  PRIMARY KEY (reel_id, card_id),
  FOREIGN KEY (reel_id) REFERENCES reels(id) ON DELETE CASCADE,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reels_sort_order ON reels(sort_order);
CREATE INDEX IF NOT EXISTS idx_reel_cards_card_id ON reel_cards(card_id);
CREATE INDEX IF NOT EXISTS idx_reel_cards_order ON reel_cards(reel_id, sort_order);
`);
}

async function ensureDefaultReel(db: AppDatabase) {
  const now = nowIso();
  await db.runAsync(
    `INSERT OR IGNORE INTO reels (
       id,
       name,
       color,
       icon,
       sort_order,
       is_archived,
       created_at,
       updated_at
     ) VALUES (?, ?, ?, ?, 0, 0, ?, ?)`,
    DEFAULT_REEL_ID,
    DEFAULT_REEL_NAME,
    DEFAULT_REEL_COLOR,
    DEFAULT_REEL_ICON,
    now,
    now,
  );
}

async function backfillDefaultReel(db: AppDatabase) {
  await db.runAsync(
    `INSERT OR IGNORE INTO reel_cards (reel_id, card_id, sort_order, added_at)
     SELECT ?, cards.id, cards.sort_order, ?
     FROM cards
     WHERE cards.is_archived = 0`,
    DEFAULT_REEL_ID,
    nowIso(),
  );
}
