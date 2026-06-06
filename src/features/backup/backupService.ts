import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import type { AppDatabase } from "@/db/types";
import { withWriteTransaction } from "@/db/types";
import {
  DEFAULT_REEL_COLOR,
  DEFAULT_REEL_ICON,
  DEFAULT_REEL_ID,
  DEFAULT_REEL_NAME,
  SELECTED_REEL_SETTING_KEY,
} from "@/features/reels/constants";
import { emitSettingChange } from "@/features/settings/settingsEvents";
import {
  deleteCardDirectoriesExcept,
  ensureCardDirectory,
} from "@/storage/cardFileStore";
import { nowIso } from "@/utils/dates";

const BACKUP_FORMAT = "com.madalfad.badgedeck.backup";
const BACKUP_SCHEMA_VERSION = 1;
const BACKUP_DIRECTORY_NAME = "badgedeck-backups";
const BADGEDECK_BACKUP_EXTENSION = "badgedeck";
const BADGEDECK_BACKUP_MIME_TYPE = "application/vnd.badgedeck.backup+json";
const EXCLUDED_SETTING_KEYS = new Set(["app_lock_enabled"]);

type BackupCategoryRow = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type BackupCardRow = {
  id: string;
  title: string;
  subtitle: string | null;
  category_id: string | null;
  primary_color: string | null;
  sort_order: number;
  is_favorite: number;
  is_archived: number;
  review_date: string | null;
  source_type: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  last_viewed_at: string | null;
};

type BackupCardAssetIdentity = {
  id: string;
  card_id: string;
  side: string;
  file_uri: string;
  thumbnail_uri: string;
  display_uri: string | null;
};

type BackupCardAssetImageInfo = {
  mime_type: string;
  width: number;
  height: number;
  thumbnail_width: number;
  thumbnail_height: number;
  file_size: number | null;
};

type BackupCardAssetAnnotations = {
  thumbhash: string | null;
  ocr_text: string | null;
  crop_data_json: string | null;
};

type BackupTimestamps = {
  created_at: string;
  updated_at: string;
};

type BackupCardAssetRow = BackupCardAssetIdentity &
  BackupCardAssetImageInfo &
  BackupCardAssetAnnotations &
  BackupTimestamps;

type BackupTagRow = {
  id: string;
  name: string;
  created_at: string;
};

type BackupCardTagRow = {
  card_id: string;
  tag_id: string;
};

type BackupReelRow = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
  is_archived: number;
  created_at: string;
  updated_at: string;
};

type BackupReelCardRow = {
  reel_id: string;
  card_id: string;
  sort_order: number;
  added_at: string;
};

type BackupSettingRow = {
  key: string;
  value: string;
  updated_at: string;
};

type BackupAssetFile = {
  name: string;
  mimeType: string | null;
  size: number | null;
  base64: string;
};

type BackupCardAsset = BackupCardAssetRow & {
  files: {
    display: BackupAssetFile | null;
    file: BackupAssetFile;
    thumbnail: BackupAssetFile;
  };
};

type BadgeDeckBackupPayload = {
  format: typeof BACKUP_FORMAT;
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  app: {
    name: "BadgeDeck";
    exportedAt: string;
  };
  data: {
    cardAssets: BackupCardAsset[];
    cardTags: BackupCardTagRow[];
    cards: BackupCardRow[];
    categories: BackupCategoryRow[];
    reelCards: BackupReelCardRow[];
    reels: BackupReelRow[];
    settings: BackupSettingRow[];
    tags: BackupTagRow[];
  };
};

type BackupExportResult = {
  assetCount: number;
  cardCount: number;
  fileName: string;
  fileUri: string;
  reelCount: number;
};

type BackupRestoreResult = {
  assetCount: number;
  cardCount: number;
  fileName: string;
  reelCount: number;
};

function getBackupDirectory() {
  const directory = new Directory(Paths.cache, BACKUP_DIRECTORY_NAME);
  directory.create({ idempotent: true, intermediates: true });
  return directory;
}

function getBackupFileName() {
  const timestamp = new Date()
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replace(/[:]/g, "")
    .replace(/[T]/g, "-");
  return `BadgeDeck-backup-${timestamp}.${BADGEDECK_BACKUP_EXTENSION}`;
}

function sanitizeFileName(value: string, fallback: string) {
  const trimmed = value.trim().replace(/[^\w.-]+/g, "-");
  return trimmed || fallback;
}

function getExtensionFromName(name: string, fallback: string) {
  const match = name.match(/\.([a-zA-Z0-9]+)$/);
  return match?.[1]?.toLowerCase() ?? fallback;
}

function getFileNameFromUri(uri: string | null, fallback: string) {
  if (!uri) {
    return fallback;
  }

  const decodedUri = decodeURIComponent(uri.split("?")[0] ?? uri);
  const match = decodedUri.match(/([^/\\]+)$/);
  return sanitizeFileName(match?.[1] ?? fallback, fallback);
}

async function readAssetFile(
  uri: string | null,
  fallbackName: string,
): Promise<BackupAssetFile | null> {
  if (!uri) {
    return null;
  }

  const file = new File(uri);
  if (!file.exists) {
    throw new Error(`Missing local asset file: ${fallbackName}`);
  }

  return {
    name: getFileNameFromUri(uri, fallbackName),
    mimeType: file.type || null,
    size: file.size || null,
    base64: await file.base64(),
  };
}

async function createBackupPayload(
  db: AppDatabase,
): Promise<BadgeDeckBackupPayload> {
  const [
    categories,
    cards,
    assetRows,
    tags,
    cardTags,
    reels,
    reelCards,
    settings,
  ] = await Promise.all([
    db.getAllAsync<BackupCategoryRow>(
      "SELECT * FROM categories ORDER BY sort_order ASC, created_at ASC",
    ),
    db.getAllAsync<BackupCardRow>(
      "SELECT * FROM cards ORDER BY sort_order ASC, created_at ASC",
    ),
    db.getAllAsync<BackupCardAssetRow>(
      "SELECT * FROM card_assets ORDER BY card_id ASC, side ASC, created_at ASC",
    ),
    db.getAllAsync<BackupTagRow>(
      "SELECT * FROM tags ORDER BY name COLLATE NOCASE ASC",
    ),
    db.getAllAsync<BackupCardTagRow>(
      "SELECT * FROM card_tags ORDER BY card_id ASC, tag_id ASC",
    ),
    db.getAllAsync<BackupReelRow>(
      "SELECT * FROM reels ORDER BY sort_order ASC, created_at ASC",
    ),
    db.getAllAsync<BackupReelCardRow>(
      "SELECT * FROM reel_cards ORDER BY reel_id ASC, sort_order ASC, added_at ASC",
    ),
    db.getAllAsync<BackupSettingRow>(
      "SELECT * FROM settings ORDER BY key ASC",
    ),
  ]);

  const cardAssets: BackupCardAsset[] = [];
  for (const asset of assetRows) {
    const original = await readAssetFile(
      asset.file_uri,
      `${asset.side}-${asset.id}-original.jpg`,
    );
    const thumbnail = await readAssetFile(
      asset.thumbnail_uri,
      `${asset.side}-${asset.id}-thumb.jpg`,
    );

    if (!original || !thumbnail) {
      throw new Error(`Asset ${asset.id} is missing required image data.`);
    }

    cardAssets.push({
      ...asset,
      files: {
        display: await readAssetFile(
          asset.display_uri,
          `${asset.side}-${asset.id}-display.jpg`,
        ),
        file: original,
        thumbnail,
      },
    });
  }

  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    app: {
      name: "BadgeDeck",
      exportedAt: nowIso(),
    },
    data: {
      cardAssets,
      cardTags,
      cards,
      categories,
      reelCards,
      reels,
      settings: settings.filter((setting) => !EXCLUDED_SETTING_KEYS.has(setting.key)),
      tags,
    },
  };
}

function parseBackupPayload(text: string): BadgeDeckBackupPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }

  const payload = parsed as Partial<BadgeDeckBackupPayload>;
  if (
    payload.format !== BACKUP_FORMAT ||
    payload.schemaVersion !== BACKUP_SCHEMA_VERSION ||
    !payload.data ||
    !Array.isArray(payload.data.cards) ||
    !Array.isArray(payload.data.cardAssets)
  ) {
    throw new Error("That file is not a supported BadgeDeck backup.");
  }

  return payload as BadgeDeckBackupPayload;
}

function createDefaultReelRow(): BackupReelRow {
  const now = nowIso();
  return {
    id: DEFAULT_REEL_ID,
    name: DEFAULT_REEL_NAME,
    color: DEFAULT_REEL_COLOR,
    icon: DEFAULT_REEL_ICON,
    sort_order: 0,
    is_archived: 0,
    created_at: now,
    updated_at: now,
  };
}

function createRestoredFile(
  cardId: string,
  assetId: string,
  side: string,
  role: "display" | "file" | "thumbnail",
  backupFile: BackupAssetFile | null,
) {
  if (!backupFile) {
    return null;
  }

  const directory = ensureCardDirectory(cardId);
  const extension = getExtensionFromName(
    backupFile.name,
    role === "file" ? "jpg" : "jpg",
  );
  const fileName = sanitizeFileName(
    `${side}-${assetId}-${role}.${extension}`,
    `${side}-${assetId}-${role}.jpg`,
  );
  const file = new File(directory, fileName);
  file.create({ intermediates: true, overwrite: true });
  file.write(backupFile.base64, { encoding: "base64" });
  return file.uri;
}

function createRestoredAssetRows(payload: BadgeDeckBackupPayload) {
  return payload.data.cardAssets.map((asset) => {
    const fileUri = createRestoredFile(
      asset.card_id,
      asset.id,
      asset.side,
      "file",
      asset.files.file,
    );
    const thumbnailUri = createRestoredFile(
      asset.card_id,
      asset.id,
      asset.side,
      "thumbnail",
      asset.files.thumbnail,
    );

    if (!fileUri || !thumbnailUri) {
      throw new Error(`Backup asset ${asset.id} is missing required files.`);
    }

    return {
      ...asset,
      display_uri: createRestoredFile(
        asset.card_id,
        asset.id,
        asset.side,
        "display",
        asset.files.display,
      ),
      file_uri: fileUri,
      thumbnail_uri: thumbnailUri,
    } satisfies BackupCardAssetRow;
  });
}

async function replaceDatabaseWithBackup(
  db: AppDatabase,
  payload: BadgeDeckBackupPayload,
  restoredAssets: BackupCardAssetRow[],
) {
  const reels =
    payload.data.reels.length > 0 ? payload.data.reels : [createDefaultReelRow()];
  const settings = payload.data.settings.filter(
    (setting) => !EXCLUDED_SETTING_KEYS.has(setting.key),
  );
  const selectedReelExists = settings.some(
    (setting) => setting.key === SELECTED_REEL_SETTING_KEY,
  );

  await withWriteTransaction(db, async (txn) => {
    await txn.runAsync("DELETE FROM reel_cards");
    await txn.runAsync("DELETE FROM card_tags");
    await txn.runAsync("DELETE FROM card_assets");
    await txn.runAsync("DELETE FROM cards");
    await txn.runAsync("DELETE FROM tags");
    await txn.runAsync("DELETE FROM categories");
    await txn.runAsync("DELETE FROM reels");
    await txn.runAsync("DELETE FROM settings");

    for (const category of payload.data.categories) {
      await txn.runAsync(
        `INSERT INTO categories (
           id, name, color, icon, sort_order, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        category.id,
        category.name,
        category.color,
        category.icon,
        category.sort_order,
        category.created_at,
        category.updated_at,
      );
    }

    for (const card of payload.data.cards) {
      await txn.runAsync(
        `INSERT INTO cards (
           id,
           title,
           subtitle,
           category_id,
           primary_color,
           sort_order,
           is_favorite,
           is_archived,
           review_date,
           source_type,
           notes,
           created_at,
           updated_at,
           last_viewed_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        card.id,
        card.title,
        card.subtitle,
        card.category_id,
        card.primary_color,
        card.sort_order,
        card.is_favorite,
        card.is_archived,
        card.review_date,
        card.source_type,
        card.notes,
        card.created_at,
        card.updated_at,
        card.last_viewed_at,
      );
    }

    for (const asset of restoredAssets) {
      await txn.runAsync(
        `INSERT INTO card_assets (
           id,
           card_id,
           side,
           file_uri,
           thumbnail_uri,
           display_uri,
           mime_type,
           width,
           height,
           thumbnail_width,
           thumbnail_height,
           file_size,
           thumbhash,
           ocr_text,
           crop_data_json,
           created_at,
           updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        asset.id,
        asset.card_id,
        asset.side,
        asset.file_uri,
        asset.thumbnail_uri,
        asset.display_uri,
        asset.mime_type,
        asset.width,
        asset.height,
        asset.thumbnail_width,
        asset.thumbnail_height,
        asset.file_size,
        asset.thumbhash,
        asset.ocr_text,
        asset.crop_data_json,
        asset.created_at,
        asset.updated_at,
      );
    }

    for (const tag of payload.data.tags) {
      await txn.runAsync(
        "INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)",
        tag.id,
        tag.name,
        tag.created_at,
      );
    }

    for (const cardTag of payload.data.cardTags) {
      await txn.runAsync(
        "INSERT INTO card_tags (card_id, tag_id) VALUES (?, ?)",
        cardTag.card_id,
        cardTag.tag_id,
      );
    }

    for (const reel of reels) {
      await txn.runAsync(
        `INSERT INTO reels (
           id, name, color, icon, sort_order, is_archived, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        reel.id,
        reel.name,
        reel.color,
        reel.icon,
        reel.sort_order,
        reel.is_archived,
        reel.created_at,
        reel.updated_at,
      );
    }

    for (const reelCard of payload.data.reelCards) {
      await txn.runAsync(
        `INSERT INTO reel_cards (reel_id, card_id, sort_order, added_at)
         VALUES (?, ?, ?, ?)`,
        reelCard.reel_id,
        reelCard.card_id,
        reelCard.sort_order,
        reelCard.added_at,
      );
    }

    for (const setting of settings) {
      await txn.runAsync(
        "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
        setting.key,
        setting.value,
        setting.updated_at,
      );
    }

    if (!selectedReelExists) {
      await txn.runAsync(
        "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
        SELECTED_REEL_SETTING_KEY,
        DEFAULT_REEL_ID,
        nowIso(),
      );
    }

    await txn.runAsync(
      "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
      "app_lock_enabled",
      "false",
      nowIso(),
    );
  });

  for (const setting of settings) {
    emitSettingChange(setting.key, setting.value);
  }
  emitSettingChange("app_lock_enabled", "false");
  if (!selectedReelExists) {
    emitSettingChange(SELECTED_REEL_SETTING_KEY, DEFAULT_REEL_ID);
  }
}

async function exportBadgeDeckBackup(
  db: AppDatabase,
): Promise<BackupExportResult> {
  const payload = await createBackupPayload(db);
  const fileName = getBackupFileName();
  const backupFile = new File(getBackupDirectory(), fileName);
  backupFile.create({ overwrite: true });
  backupFile.write(JSON.stringify(payload, null, 2));

  return {
    assetCount: payload.data.cardAssets.length,
    cardCount: payload.data.cards.length,
    fileName,
    fileUri: backupFile.uri,
    reelCount: payload.data.reels.length,
  };
}

export async function shareBadgeDeckBackup(db: AppDatabase) {
  const result = await exportBadgeDeckBackup(db);
  const isSharingAvailable = await Sharing.isAvailableAsync();
  if (!isSharingAvailable) {
    throw new Error(`Backup created but sharing is not available: ${result.fileUri}`);
  }

  await Sharing.shareAsync(result.fileUri, {
    dialogTitle: "Export BadgeDeck backup",
    mimeType: BADGEDECK_BACKUP_MIME_TYPE,
    UTI: "com.madalfad.badgedeck.backup",
  });

  return result;
}

async function restoreBadgeDeckBackupFromUri(
  db: AppDatabase,
  uri: string,
  fileName = "BadgeDeck backup",
): Promise<BackupRestoreResult> {
  const file = new File(uri);
  const payload = parseBackupPayload(await file.text());
  const restoredAssets = createRestoredAssetRows(payload);
  await replaceDatabaseWithBackup(db, payload, restoredAssets);
  deleteCardDirectoriesExcept(payload.data.cards.map((card) => card.id));

  return {
    assetCount: restoredAssets.length,
    cardCount: payload.data.cards.length,
    fileName,
    reelCount: payload.data.reels.length,
  };
}

export async function pickAndRestoreBadgeDeckBackup(db: AppDatabase) {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: ["application/json", BADGEDECK_BACKUP_MIME_TYPE, "*/*"],
  });

  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];
  return restoreBadgeDeckBackupFromUri(db, asset.uri, asset.name);
}
