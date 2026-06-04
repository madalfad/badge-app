import type { BadgeCard } from "@/features/cards/types";
import {
  DEFAULT_REEL_COLOR,
  DEFAULT_REEL_ICON,
  DEFAULT_REEL_ID,
} from "@/features/reels/constants";
import type {
  CreateReelInput,
  ReelRecord,
  UpdateReelInput,
} from "@/features/reels/types";
import { nowIso } from "@/utils/dates";
import { createId } from "@/utils/ids";

import { listCards } from "./cardsRepository";
import type { AppDatabase } from "../types";

type ReelRow = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
  is_archived: number;
  created_at: string;
  updated_at: string;
  active_card_count: number | null;
  total_card_count: number | null;
};

type ListReelsOptions = {
  includeArchived?: boolean;
};

const DEFAULT_REEL_ERROR = "The default reel can’t be archived or deleted.";

function mapReel(row: ReelRow): ReelRecord {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    sortOrder: row.sort_order,
    isArchived: row.is_archived === 1,
    activeCardCount: row.active_card_count ?? 0,
    totalCardCount: row.total_card_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertMutableReel(reelId: string) {
  if (reelId === DEFAULT_REEL_ID) {
    throw new Error(DEFAULT_REEL_ERROR);
  }
}

function normalizeReelName(name: string) {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("A reel name is required.");
  }
  return trimmedName;
}

async function getNextReelSortOrder(db: AppDatabase) {
  const row = await db.getFirstAsync<{ next_sort_order: number }>(
    "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order FROM reels",
  );
  return row?.next_sort_order ?? 0;
}

async function getNextCardSortOrderInReel(db: AppDatabase, reelId: string) {
  const row = await db.getFirstAsync<{ next_sort_order: number }>(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order
     FROM reel_cards
     WHERE reel_id = ?`,
    reelId,
  );
  return row?.next_sort_order ?? 0;
}

async function getExistingReelIds(db: AppDatabase, reelIds: string[]) {
  const existingIds: string[] = [];
  for (const reelId of reelIds) {
    const row = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM reels WHERE id = ? AND is_archived = 0",
      reelId,
    );
    if (row?.id) {
      existingIds.push(row.id);
    }
  }
  return existingIds;
}

export async function listReels(
  db: AppDatabase,
  options: ListReelsOptions = {},
) {
  const rows = await db.getAllAsync<ReelRow>(
    `SELECT
       reels.*,
       COALESCE(SUM(CASE WHEN cards.is_archived = 0 THEN 1 ELSE 0 END), 0) AS active_card_count,
       COUNT(reel_cards.card_id) AS total_card_count
     FROM reels
     LEFT JOIN reel_cards ON reel_cards.reel_id = reels.id
     LEFT JOIN cards ON cards.id = reel_cards.card_id
     ${options.includeArchived ? "" : "WHERE reels.is_archived = 0"}
     GROUP BY reels.id
     ORDER BY reels.is_archived ASC, reels.sort_order ASC, reels.created_at ASC`,
  );
  return rows.map(mapReel);
}

export async function createReel(db: AppDatabase, input: CreateReelInput) {
  const id = createId("reel");
  const now = nowIso();
  const sortOrder = await getNextReelSortOrder(db);

  await db.runAsync(
    `INSERT INTO reels (
       id,
       name,
       color,
       icon,
       sort_order,
       is_archived,
       created_at,
       updated_at
     ) VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
    id,
    normalizeReelName(input.name),
    input.color ?? DEFAULT_REEL_COLOR,
    input.icon ?? DEFAULT_REEL_ICON,
    sortOrder,
    now,
    now,
  );

  return id;
}

export async function updateReel(
  db: AppDatabase,
  reelId: string,
  patch: UpdateReelInput,
) {
  const updates: string[] = [];
  const params: unknown[] = [];

  const addUpdate = (column: string, value: unknown) => {
    updates.push(`${column} = ?`);
    params.push(value);
  };

  if ("name" in patch) {
    addUpdate("name", normalizeReelName(patch.name ?? ""));
  }
  if ("color" in patch) {
    addUpdate("color", patch.color ?? DEFAULT_REEL_COLOR);
  }
  if ("icon" in patch) {
    addUpdate("icon", patch.icon ?? DEFAULT_REEL_ICON);
  }
  if ("sortOrder" in patch) {
    addUpdate("sort_order", patch.sortOrder ?? 0);
  }
  if ("isArchived" in patch) {
    if (patch.isArchived) {
      assertMutableReel(reelId);
    }
    addUpdate("is_archived", patch.isArchived ? 1 : 0);
  }

  if (updates.length === 0) {
    return;
  }

  addUpdate("updated_at", nowIso());
  params.push(reelId);

  await db.runAsync(
    `UPDATE reels SET ${updates.join(", ")} WHERE id = ?`,
    ...params,
  );
}

export async function archiveReel(db: AppDatabase, reelId: string) {
  assertMutableReel(reelId);
  await updateReel(db, reelId, { isArchived: true });
}

export async function deleteReel(db: AppDatabase, reelId: string) {
  assertMutableReel(reelId);
  await db.runAsync("DELETE FROM reels WHERE id = ?", reelId);
}

export async function reorderReels(db: AppDatabase, reelIds: string[]) {
  for (const [sortOrder, reelId] of reelIds.entries()) {
    await updateReel(db, reelId, { sortOrder });
  }
}

export async function listCardsForReel(
  db: AppDatabase,
  reelId: string,
  options: { includeArchived?: boolean } = {},
): Promise<BadgeCard[]> {
  return listCards(db, { ...options, reelId });
}

export async function listReelIdsForCard(db: AppDatabase, cardId: string) {
  const rows = await db.getAllAsync<{ reel_id: string }>(
    `SELECT reel_id
     FROM reel_cards
     WHERE card_id = ?
     ORDER BY sort_order ASC, added_at ASC`,
    cardId,
  );
  return rows.map((row) => row.reel_id);
}

export async function addCardToReel(
  db: AppDatabase,
  reelId: string,
  cardId: string,
  sortOrder?: number,
) {
  const nextSortOrder =
    sortOrder ?? (await getNextCardSortOrderInReel(db, reelId));
  await db.runAsync(
    `INSERT OR IGNORE INTO reel_cards (reel_id, card_id, sort_order, added_at)
     VALUES (?, ?, ?, ?)`,
    reelId,
    cardId,
    nextSortOrder,
    nowIso(),
  );
}

export async function removeCardFromReel(
  db: AppDatabase,
  reelId: string,
  cardId: string,
) {
  await db.runAsync(
    "DELETE FROM reel_cards WHERE reel_id = ? AND card_id = ?",
    reelId,
    cardId,
  );
}

export async function setCardReels(
  db: AppDatabase,
  cardId: string,
  requestedReelIds: string[],
) {
  const uniqueRequestedIds = Array.from(new Set(requestedReelIds));
  const targetReelIds = await getExistingReelIds(
    db,
    uniqueRequestedIds.length > 0 ? uniqueRequestedIds : [DEFAULT_REEL_ID],
  );
  const finalReelIds =
    targetReelIds.length > 0 ? targetReelIds : [DEFAULT_REEL_ID];

  for (const reelId of finalReelIds) {
    await addCardToReel(db, reelId, cardId);
  }

  const placeholders = finalReelIds.map(() => "?").join(", ");
  await db.runAsync(
    `DELETE FROM reel_cards
     WHERE card_id = ? AND reel_id NOT IN (${placeholders})`,
    cardId,
    ...finalReelIds,
  );
}
