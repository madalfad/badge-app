import type { CardAssetRecord } from '@/features/cards/types';
import { nowIso } from '@/utils/dates';
import { createId } from '@/utils/ids';

import type { AppDatabase } from '../types';

type CardAssetRow = {
  id: string;
  card_id: string;
  side: string;
  file_uri: string;
  thumbnail_uri: string;
  display_uri: string | null;
  mime_type: string;
  width: number;
  height: number;
  thumbnail_width: number;
  thumbnail_height: number;
  file_size: number | null;
  thumbhash: string | null;
  ocr_text: string | null;
  crop_data_json: string | null;
  created_at: string;
  updated_at: string;
};

type UpsertCardAssetInput = {
  id?: string;
  cardId: string;
  side: string;
  fileUri: string;
  thumbnailUri: string;
  displayUri?: string | null;
  mimeType: string;
  width: number;
  height: number;
  thumbnailWidth: number;
  thumbnailHeight: number;
  fileSize?: number | null;
  thumbhash?: string | null;
  ocrText?: string | null;
  cropDataJson?: string | null;
};

function mapAsset(row: CardAssetRow): CardAssetRecord {
  return {
    id: row.id,
    cardId: row.card_id,
    side: row.side,
    fileUri: row.file_uri,
    thumbnailUri: row.thumbnail_uri,
    displayUri: row.display_uri,
    mimeType: row.mime_type,
    width: row.width,
    height: row.height,
    thumbnailWidth: row.thumbnail_width,
    thumbnailHeight: row.thumbnail_height,
    fileSize: row.file_size,
    thumbhash: row.thumbhash,
    ocrText: row.ocr_text,
    cropDataJson: row.crop_data_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listAssetsForCard(db: AppDatabase, cardId: string) {
  const rows = await db.getAllAsync<CardAssetRow>(
    'SELECT * FROM card_assets WHERE card_id = ? ORDER BY side ASC, created_at ASC',
    cardId,
  );
  return rows.map(mapAsset);
}

export async function getPrimaryAsset(db: AppDatabase, cardId: string) {
  const row = await db.getFirstAsync<CardAssetRow>(
    `SELECT * FROM card_assets
     WHERE card_id = ?
     ORDER BY CASE side WHEN 'front' THEN 0 WHEN 'back' THEN 1 ELSE 2 END, created_at ASC
     LIMIT 1`,
    cardId,
  );
  return row ? mapAsset(row) : null;
}

export async function upsertAsset(db: AppDatabase, input: UpsertCardAssetInput) {
  const id = input.id ?? createId('asset');
  const now = nowIso();

  await db.runAsync(
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
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       side = excluded.side,
       file_uri = excluded.file_uri,
       thumbnail_uri = excluded.thumbnail_uri,
       display_uri = excluded.display_uri,
       mime_type = excluded.mime_type,
       width = excluded.width,
       height = excluded.height,
       thumbnail_width = excluded.thumbnail_width,
       thumbnail_height = excluded.thumbnail_height,
       file_size = excluded.file_size,
       thumbhash = excluded.thumbhash,
       ocr_text = excluded.ocr_text,
       crop_data_json = excluded.crop_data_json,
       updated_at = excluded.updated_at`,
    id,
    input.cardId,
    input.side,
    input.fileUri,
    input.thumbnailUri,
    input.displayUri ?? null,
    input.mimeType,
    input.width,
    input.height,
    input.thumbnailWidth,
    input.thumbnailHeight,
    input.fileSize ?? null,
    input.thumbhash ?? null,
    input.ocrText ?? null,
    input.cropDataJson ?? null,
    now,
    now,
  );

  return id;
}

export async function deleteAsset(db: AppDatabase, assetId: string) {
  await db.runAsync('DELETE FROM card_assets WHERE id = ?', assetId);
}
