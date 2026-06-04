import { upsertCategory } from "@/db/repositories/categoriesRepository";
import { upsertCard } from "@/db/repositories/cardsRepository";
import { addCardToReel } from "@/db/repositories/reelsRepository";
import { getSetting, setSetting } from "@/db/repositories/settingsRepository";
import { DEFAULT_REEL_ID } from "@/features/reels/constants";
import type { AppDatabase } from "@/db/types";
import { withWriteTransaction } from "@/db/types";
import { sampleBadgeCards } from "@/features/reel/sampleCards";

const SAMPLE_SEED_SETTING = "sample_seed_version";
const SAMPLE_SEED_VERSION = "1";

export async function ensureSampleCardsSeeded(db: AppDatabase) {
  const currentSeedVersion = await getSetting(db, SAMPLE_SEED_SETTING);
  if (currentSeedVersion === SAMPLE_SEED_VERSION) {
    return;
  }

  await withWriteTransaction(db, async (txn) => {
    for (const [index, card] of sampleBadgeCards.entries()) {
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
        sourceType: "sample_seed",
        notes: JSON.stringify({
          code: card.code,
          sections: card.sections,
          footer: card.footer,
        }),
      });
      await addCardToReel(txn, DEFAULT_REEL_ID, card.id, index);
    }

    await setSetting(txn, SAMPLE_SEED_SETTING, SAMPLE_SEED_VERSION);
  });
}
