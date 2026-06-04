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
  tag_names: string | null;
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
    isArchived: row.is_archived === 1,
    lastViewedAt: row.last_viewed_at,
    frontThumbnailUri: row.primary_thumbnail_uri,
    frontDisplayUri: row.primary_display_uri,
    frontFileUri: row.primary_file_uri,
    imageAspectRatio,
    hasUserImage: Boolean(
      row.primary_thumbnail_uri ||
      row.primary_display_uri ||
      row.primary_file_uri,
    ),
    tags: row.tag_names
      ? row.tag_names
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [],
  };
}

function createCardSelect(cardJoin = "") {
  return `
SELECT
  cards.*,
  categories.name AS category_name,
  categories.color AS category_color,
  primary_asset.thumbnail_uri AS primary_thumbnail_uri,
  primary_asset.display_uri AS primary_display_uri,
  primary_asset.file_uri AS primary_file_uri,
  primary_asset.width AS primary_width,
  primary_asset.height AS primary_height,
  (
    SELECT GROUP_CONCAT(tags.name, ',')
    FROM tags
    INNER JOIN card_tags ON card_tags.tag_id = tags.id
    WHERE card_tags.card_id = cards.id
  ) AS tag_names
FROM cards
${cardJoin}
LEFT JOIN categories ON categories.id = cards.category_id
LEFT JOIN card_assets AS primary_asset ON primary_asset.id = (
  SELECT id
  FROM card_assets
  WHERE card_id = cards.id
  ORDER BY CASE side WHEN 'front' THEN 0 WHEN 'back' THEN 1 ELSE 2 END, created_at ASC
  LIMIT 1
)
`;
}

type ListCardsOptions = {
  includeArchived?: boolean;
  reelId?: string | null;
};

export async function listCards(
  db: AppDatabase,
  options: ListCardsOptions = {},
) {
  const params: unknown[] = [];
  const cardJoin = options.reelId
    ? "INNER JOIN reel_cards ON reel_cards.card_id = cards.id AND reel_cards.reel_id = ?"
    : "";
  if (options.reelId) {
    params.push(options.reelId);
  }

  const orderBy = options.reelId
    ? "cards.is_archived ASC, reel_cards.sort_order ASC, reel_cards.added_at ASC, cards.created_at ASC"
    : "cards.is_archived ASC, cards.sort_order ASC, cards.created_at ASC";

  const rows = await db.getAllAsync<CardRow>(
    `${createCardSelect(cardJoin)}
     ${options.includeArchived ? "" : "WHERE cards.is_archived = 0"}
     ORDER BY ${orderBy}`,
    ...params,
  );
  return rows.map(mapCardRowToBadgeCard);
}

export async function getCardById(db: AppDatabase, id: string) {
  const row = await db.getFirstAsync<CardRow>(
    `${createCardSelect()} WHERE cards.id = ?`,
    id,
  );
  return row ? mapCardRowToBadgeCard(row) : null;
}

type InsertableCardInput = CreateCardInput & { id: string };

const UPSERT_CARD_CONFLICT_CLAUSE = `
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
       updated_at = excluded.updated_at`;

async function insertCard(
  db: AppDatabase,
  input: InsertableCardInput,
  conflictClause = "",
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
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)${conflictClause}`,
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

export async function createCard(db: AppDatabase, input: CreateCardInput) {
  return insertCard(db, { ...input, id: input.id ?? createId("card") });
}

export async function upsertCard(db: AppDatabase, input: InsertableCardInput) {
  return insertCard(db, input, UPSERT_CARD_CONFLICT_CLAUSE);
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

  const addPatchUpdate = (
    key: keyof UpdateCardInput,
    column: string,
    value: unknown,
  ) => {
    if (key in patch) {
      addUpdate(column, value);
    }
  };

  addPatchUpdate("title", "title", patch.title);
  addPatchUpdate("subtitle", "subtitle", patch.subtitle ?? null);
  addPatchUpdate("categoryId", "category_id", patch.categoryId ?? null);
  addPatchUpdate("primaryColor", "primary_color", patch.primaryColor ?? null);
  addPatchUpdate("sortOrder", "sort_order", patch.sortOrder ?? 0);
  addPatchUpdate("isFavorite", "is_favorite", patch.isFavorite ? 1 : 0);
  addPatchUpdate("isArchived", "is_archived", patch.isArchived ? 1 : 0);
  addPatchUpdate("reviewDate", "review_date", patch.reviewDate ?? null);
  addPatchUpdate("sourceType", "source_type", patch.sourceType ?? "user_image");
  addPatchUpdate("notes", "notes", patch.notes ?? null);

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

export async function markViewed(db: AppDatabase, id: string) {
  await db.runAsync(
    "UPDATE cards SET last_viewed_at = ? WHERE id = ?",
    nowIso(),
    id,
  );
}
