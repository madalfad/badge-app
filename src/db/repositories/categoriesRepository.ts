import type { CategoryRecord } from "@/features/cards/types";
import { nowIso } from "@/utils/dates";
import { createId } from "@/utils/ids";

import type { AppDatabase } from "../types";

type CategoryRow = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function mapCategory(row: CategoryRow): CategoryRecord {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getCategoryByName(db: AppDatabase, name: string) {
  const row = await db.getFirstAsync<CategoryRow>(
    "SELECT * FROM categories WHERE name = ?",
    name,
  );
  return row ? mapCategory(row) : null;
}

export async function upsertCategory(
  db: AppDatabase,
  input: {
    id?: string;
    name: string;
    color?: string | null;
    icon?: string | null;
    sortOrder?: number;
  },
) {
  const id = input.id ?? createId("cat");
  const now = nowIso();

  await db.runAsync(
    `INSERT INTO categories (id, name, color, icon, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       color = excluded.color,
       icon = excluded.icon,
       sort_order = excluded.sort_order,
       updated_at = excluded.updated_at`,
    id,
    input.name,
    input.color ?? null,
    input.icon ?? null,
    input.sortOrder ?? 0,
    now,
    now,
  );

  const category = await getCategoryByName(db, input.name);
  if (!category) {
    throw new Error(`Failed to upsert category: ${input.name}`);
  }
  return category;
}
