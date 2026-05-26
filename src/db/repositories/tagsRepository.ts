import { nowIso } from '@/utils/dates';
import { createId } from '@/utils/ids';

import type { AppDatabase } from '../types';

type TagRow = {
  id: string;
  name: string;
  created_at: string;
};

export async function listTags(db: AppDatabase) {
  return db.getAllAsync<TagRow>('SELECT * FROM tags ORDER BY name COLLATE NOCASE ASC');
}

async function upsertTag(db: AppDatabase, name: string) {
  const id = createId('tag');
  const now = nowIso();
  await db.runAsync(
    `INSERT INTO tags (id, name, created_at)
     VALUES (?, ?, ?)
     ON CONFLICT(name) DO NOTHING`,
    id,
    name,
    now,
  );

  const row = await db.getFirstAsync<TagRow>('SELECT * FROM tags WHERE name = ?', name);
  if (!row) {
    throw new Error(`Failed to upsert tag: ${name}`);
  }
  return row;
}

export async function setTagsForCard(db: AppDatabase, cardId: string, tagNames: string[]) {
  await db.runAsync('DELETE FROM card_tags WHERE card_id = ?', cardId);

  const uniqueTagNames = Array.from(
    new Set(tagNames.map((name) => name.trim()).filter((name) => name.length > 0)),
  );

  for (const tagName of uniqueTagNames) {
    const tag = await upsertTag(db, tagName);
    await db.runAsync(
      'INSERT OR IGNORE INTO card_tags (card_id, tag_id) VALUES (?, ?)',
      cardId,
      tag.id,
    );
  }
}

export async function listTagsForCard(db: AppDatabase, cardId: string) {
  const rows = await db.getAllAsync<{ name: string }>(
    `SELECT tags.name
     FROM tags
     INNER JOIN card_tags ON card_tags.tag_id = tags.id
     WHERE card_tags.card_id = ?
     ORDER BY tags.name COLLATE NOCASE ASC`,
    cardId,
  );
  return rows.map((row) => row.name);
}
