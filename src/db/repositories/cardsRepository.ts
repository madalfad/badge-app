import type {
  BadgeCard,
  CreateCardInput,
  SeededCardNotes,
  UpdateCardInput,
} from "@/features/cards/types";
import { nowIso } from "@/utils/dates";
import { createId } from "@/utils/ids";

import type { AppDatabase } from "../types";

type CardRow = {
  id: string;
  title: string;
  subtitle: string | null;
  category_id: string | null;
  category_name: string | null;
  category_color: string | null;
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
  primary_thumbnail_uri: string | null;
  primary_display_uri: string | null;
  primary_file_uri: string | null;
  primary_width: number | null;
  primary_height: number | null;
};

const DEFAULT_ACCENT = "#2DD4BF";

function parseSeededCardNotes(notes: string | null): SeededCardNotes {
  if (!notes) {
    return {};
  }

  try {
    const parsed = JSON.parse(notes) as SeededCardNotes;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function mapCardRowToBadgeCard(row: CardRow): BadgeCard {
  const notes = parseSeededCardNotes(row.notes);
  const imageAspectRatio =
    row.primary_width && row.primary_height
      ? row.primary_width / row.primary_height
      : null;

  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? "",
    category: row.category_name ?? "Uncategorized",
    accentColor: row.primary_color ?? row.category_color ?? DEFAULT_ACCENT,
    code: notes.code ?? row.source_type.toUpperCase(),
    sections: notes.sections ?? [],
    footer: notes.footer ?? "Reference only • verify local protocol",
    isFavorite: row.is_favorite === 1,
    frontThumbnailUri: row.primary_thumbnail_uri,
    frontDisplayUri: row.primary_display_uri,
    frontFileUri: row.primary_file_uri,
    imageAspectRatio,
    hasUserImage: Boolean(
      row.primary_thumbnail_uri ||
      row.primary_display_uri ||
      row.primary_file_uri,
    ),
  };
}

const CARD_SELECT = `
SELECT
  cards.*,
  categories.name AS category_name,
  categories.color AS category_color,
  primary_asset.thumbnail_uri AS primary_thumbnail_uri,
  primary_asset.display_uri AS primary_display_uri,
  primary_asset.file_uri AS primary_file_uri,
  primary_asset.width AS primary_width,
  primary_asset.height AS primary_height
FROM cards
LEFT JOIN categories ON categories.id = cards.category_id
LEFT JOIN card_assets AS primary_asset ON primary_asset.id = (
  SELECT id
  FROM card_assets
  WHERE card_id = cards.id
  ORDER BY CASE side WHEN 'front' THEN 0 WHEN 'back' THEN 1 ELSE 2 END, created_at ASC
  LIMIT 1
)
`;

export async function listCards(db: AppDatabase) {
  const rows = await db.getAllAsync<CardRow>(
    `${CARD_SELECT}
     WHERE cards.is_archived = 0
     ORDER BY cards.sort_order ASC, cards.created_at ASC`,
  );
  return rows.map(mapCardRowToBadgeCard);
}

export async function getCardById(db: AppDatabase, id: string) {
  const row = await db.getFirstAsync<CardRow>(
    `${CARD_SELECT} WHERE cards.id = ?`,
    id,
  );
  return row ? mapCardRowToBadgeCard(row) : null;
}

export async function createCard(db: AppDatabase, input: CreateCardInput) {
  const id = input.id ?? createId("card");
  const now = nowIso();

  await db.runAsync(
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
    id,
    input.title,
    input.subtitle ?? null,
    input.categoryId ?? null,
    input.primaryColor ?? null,
    input.sortOrder ?? 0,
    input.isFavorite ? 1 : 0,
    input.isArchived ? 1 : 0,
    input.reviewDate ?? null,
    input.sourceType ?? "user_image",
    input.notes ?? null,
    now,
    now,
    null,
  );

  return id;
}

export async function upsertCard(
  db: AppDatabase,
  input: CreateCardInput & { id: string },
) {
  const now = nowIso();

  await db.runAsync(
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
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       subtitle = excluded.subtitle,
       category_id = excluded.category_id,
       primary_color = excluded.primary_color,
       sort_order = excluded.sort_order,
       is_favorite = excluded.is_favorite,
       is_archived = excluded.is_archived,
       review_date = excluded.review_date,
       source_type = excluded.source_type,
       notes = excluded.notes,
       updated_at = excluded.updated_at`,
    input.id,
    input.title,
    input.subtitle ?? null,
    input.categoryId ?? null,
    input.primaryColor ?? null,
    input.sortOrder ?? 0,
    input.isFavorite ? 1 : 0,
    input.isArchived ? 1 : 0,
    input.reviewDate ?? null,
    input.sourceType ?? "user_image",
    input.notes ?? null,
    now,
    now,
    null,
  );

  return input.id;
}

export async function updateCard(
  db: AppDatabase,
  id: string,
  patch: UpdateCardInput,
) {
  const updates: string[] = [];
  const params: unknown[] = [];

  const addUpdate = (column: string, value: unknown) => {
    updates.push(`${column} = ?`);
    params.push(value);
  };

  if ("title" in patch) addUpdate("title", patch.title);
  if ("subtitle" in patch) addUpdate("subtitle", patch.subtitle ?? null);
  if ("categoryId" in patch) addUpdate("category_id", patch.categoryId ?? null);
  if ("primaryColor" in patch)
    addUpdate("primary_color", patch.primaryColor ?? null);
  if ("sortOrder" in patch) addUpdate("sort_order", patch.sortOrder ?? 0);
  if ("isFavorite" in patch) addUpdate("is_favorite", patch.isFavorite ? 1 : 0);
  if ("isArchived" in patch) addUpdate("is_archived", patch.isArchived ? 1 : 0);
  if ("reviewDate" in patch) addUpdate("review_date", patch.reviewDate ?? null);
  if ("sourceType" in patch)
    addUpdate("source_type", patch.sourceType ?? "user_image");
  if ("notes" in patch) addUpdate("notes", patch.notes ?? null);

  if (updates.length === 0) {
    return;
  }

  addUpdate("updated_at", nowIso());
  params.push(id);

  await db.runAsync(
    `UPDATE cards SET ${updates.join(", ")} WHERE id = ?`,
    ...params,
  );
}

export async function archiveCard(db: AppDatabase, id: string) {
  await updateCard(db, id, { isArchived: true });
}

export async function deleteCard(db: AppDatabase, id: string) {
  await db.runAsync("DELETE FROM cards WHERE id = ?", id);
}

export async function toggleFavorite(db: AppDatabase, id: string) {
  await db.runAsync(
    `UPDATE cards
     SET is_favorite = CASE is_favorite WHEN 1 THEN 0 ELSE 1 END,
         updated_at = ?
     WHERE id = ?`,
    nowIso(),
    id,
  );
}

export async function reorderCards(db: AppDatabase, cardIds: string[]) {
  for (const [sortOrder, cardId] of cardIds.entries()) {
    await db.runAsync(
      "UPDATE cards SET sort_order = ?, updated_at = ? WHERE id = ?",
      sortOrder,
      nowIso(),
      cardId,
    );
  }
}

export async function markViewed(db: AppDatabase, id: string) {
  await db.runAsync(
    "UPDATE cards SET last_viewed_at = ? WHERE id = ?",
    nowIso(),
    id,
  );
}

export async function searchCards(db: AppDatabase, query: string) {
  const normalizedQuery = `%${query.trim()}%`;
  if (query.trim().length === 0) {
    return listCards(db);
  }

  const rows = await db.getAllAsync<CardRow>(
    `${CARD_SELECT}
     WHERE cards.is_archived = 0
       AND (
         cards.title LIKE ?
         OR cards.subtitle LIKE ?
         OR cards.notes LIKE ?
         OR categories.name LIKE ?
       )
     ORDER BY cards.sort_order ASC, cards.created_at ASC`,
    normalizedQuery,
    normalizedQuery,
    normalizedQuery,
    normalizedQuery,
  );

  return rows.map(mapCardRowToBadgeCard);
}
