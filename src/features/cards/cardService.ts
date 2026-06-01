import { upsertAsset } from "@/db/repositories/cardAssetsRepository";
import {
  archiveCard,
  createCard,
  deleteCard,
  markViewed,
  toggleFavorite,
  updateCard,
} from "@/db/repositories/cardsRepository";
import { upsertCategory } from "@/db/repositories/categoriesRepository";
import { setTagsForCard } from "@/db/repositories/tagsRepository";
import type { AppDatabase } from "@/db/types";
import { withWriteTransaction } from "@/db/types";
import type { CreateCardInput, UpdateCardInput } from "@/features/cards/types";
import {
  deleteCardDirectory,
  ensureCardDirectory,
} from "@/storage/cardFileStore";
import {
  cleanupFailedImport,
  processAndStoreCardImage,
  type SourceCardImage,
} from "@/storage/imagePipeline";
import { createId } from "@/utils/ids";

type CreateCardFromImagesInput = {
  title: string;
  subtitle?: string | null;
  categoryName?: string | null;
  tags?: string[];
  isFavorite?: boolean;
  primaryColor?: string | null;
  frontImage: SourceCardImage;
  backImage?: SourceCardImage | null;
};

type NextSortOrderRow = {
  next_sort_order: number;
};

async function getNextSortOrder(db: AppDatabase) {
  const row = await db.getFirstAsync<NextSortOrderRow>(
    "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order FROM cards",
  );
  return row?.next_sort_order ?? 0;
}

export async function createCardRecord(
  db: AppDatabase,
  input: CreateCardInput,
) {
  const cardId = await createCard(db, input);
  ensureCardDirectory(cardId);
  return cardId;
}

export async function createCardFromImages(
  db: AppDatabase,
  input: CreateCardFromImagesInput,
) {
  const cardId = createId("card");
  ensureCardDirectory(cardId);

  try {
    const [frontAsset, backAsset] = await Promise.all([
      processAndStoreCardImage(cardId, "front", input.frontImage),
      input.backImage
        ? processAndStoreCardImage(cardId, "back", input.backImage)
        : null,
    ]);

    await withWriteTransaction(db, async (txn) => {
      const category = input.categoryName?.trim()
        ? await upsertCategory(txn, {
            name: input.categoryName.trim(),
            color: input.primaryColor ?? "#2DD4BF",
          })
        : null;
      const sortOrder = await getNextSortOrder(txn);

      await createCard(txn, {
        id: cardId,
        title: input.title.trim(),
        subtitle: input.subtitle?.trim() || null,
        categoryId: category?.id ?? null,
        primaryColor: input.primaryColor ?? category?.color ?? "#2DD4BF",
        sortOrder,
        isFavorite: input.isFavorite ?? false,
        sourceType: "user_image",
        notes: null,
      });

      await upsertAsset(txn, {
        cardId,
        side: frontAsset.side,
        fileUri: frontAsset.fileUri,
        thumbnailUri: frontAsset.thumbnailUri,
        displayUri: frontAsset.displayUri,
        mimeType: frontAsset.mimeType,
        width: frontAsset.width,
        height: frontAsset.height,
        thumbnailWidth: frontAsset.thumbnailWidth,
        thumbnailHeight: frontAsset.thumbnailHeight,
        fileSize: frontAsset.fileSize,
        cropDataJson: frontAsset.cropDataJson,
      });

      if (backAsset) {
        await upsertAsset(txn, {
          cardId,
          side: backAsset.side,
          fileUri: backAsset.fileUri,
          thumbnailUri: backAsset.thumbnailUri,
          displayUri: backAsset.displayUri,
          mimeType: backAsset.mimeType,
          width: backAsset.width,
          height: backAsset.height,
          thumbnailWidth: backAsset.thumbnailWidth,
          thumbnailHeight: backAsset.thumbnailHeight,
          fileSize: backAsset.fileSize,
          cropDataJson: backAsset.cropDataJson,
        });
      }

      if (input.tags) {
        await setTagsForCard(txn, cardId, input.tags);
      }
    });

    return cardId;
  } catch (error) {
    cleanupFailedImport(cardId);
    throw error;
  }
}

export async function updateCardRecord(
  db: AppDatabase,
  cardId: string,
  patch: UpdateCardInput,
) {
  await updateCard(db, cardId, patch);
}

export async function archiveCardRecord(db: AppDatabase, cardId: string) {
  await archiveCard(db, cardId);
}

export async function deleteCardRecordAndFiles(
  db: AppDatabase,
  cardId: string,
) {
  await deleteCard(db, cardId);
  deleteCardDirectory(cardId);
}

export async function toggleCardFavorite(db: AppDatabase, cardId: string) {
  await toggleFavorite(db, cardId);
}

export async function markCardAsViewed(db: AppDatabase, cardId: string) {
  await markViewed(db, cardId);
}
