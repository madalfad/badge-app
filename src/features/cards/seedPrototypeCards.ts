import { upsertCategory } from '@/db/repositories/categoriesRepository';
import { upsertCard } from '@/db/repositories/cardsRepository';
import { getSetting, setSetting } from '@/db/repositories/settingsRepository';
import type { AppDatabase } from '@/db/types';
import { withWriteTransaction } from '@/db/types';
import { mockBadgeCards } from '@/features/reel/mockCards';

const PROTOTYPE_SEED_SETTING = 'prototype_seed_version';
const PROTOTYPE_SEED_VERSION = '1';

export async function ensurePrototypeCardsSeeded(db: AppDatabase) {
  const currentSeedVersion = await getSetting(db, PROTOTYPE_SEED_SETTING);
  if (currentSeedVersion === PROTOTYPE_SEED_VERSION) {
    return;
  }

  await withWriteTransaction(db, async (txn) => {
    for (const [index, card] of mockBadgeCards.entries()) {
      const category = await upsertCategory(txn, {
        id: `category-${card.category.toLowerCase()}`,
        name: card.category,
        color: card.accentColor,
        sortOrder: index,
      });

      await upsertCard(txn, {
        id: card.id,
        title: card.title,
        subtitle: card.subtitle,
        categoryId: category.id,
        primaryColor: card.accentColor,
        sortOrder: index,
        isFavorite: card.isFavorite,
        sourceType: 'prototype_seed',
        notes: JSON.stringify({
          code: card.code,
          sections: card.sections,
          footer: card.footer,
        }),
      });
    }

    await setSetting(txn, PROTOTYPE_SEED_SETTING, PROTOTYPE_SEED_VERSION);
  });
}
