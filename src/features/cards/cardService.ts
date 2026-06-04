import {
  deleteAsset,
  listAssetsForCard,
  upsertAsset,
} from "@/db/repositories/cardAssetsRepository";
import {
  archiveCard,
  createCard,
  deleteCard,
  toggleFavorite,
  updateCard,
} from "@/db/repositories/cardsRepository";
import { upsertCategory } from "@/db/repositories/categoriesRepository";
import { setCardReels } from "@/db/repositories/reelsRepository";
import { setTagsForCard } from "@/db/repositories/tagsRepository";
import type { AppDatabase } from "@/db/types";
import { withWriteTransaction } from "@/db/types";

import {
  deleteCardDirectory,
  deleteStoredCardAssetFiles,
  ensureCardDirectory,
} from "@/storage/cardFileStore";
import {
  cleanupFailedImport,
  processAndStoreCardImage,
  type CardImageSide,
  type ProcessedCardAsset,
  type SourceCardImage,
} from "@/storage/imagePipeline";
import { createId } from "@/utils/ids";
import type { BadgeCardSection } from "./types";

type CreateCardFromImagesInput = {
  title: string;
  subtitle?: string | null;
  categoryName?: string | null;
  tags?: string[];
  isFavorite?: boolean;
  primaryColor?: string | null;
  frontImage: SourceCardImage;
  backImage?: SourceCardImage | null;
  reelIds?: string[];
};

type CreateCardFromTextInput = {
  title: string;
  subtitle?: string | null;
  categoryName?: string | null;
  tags?: string[];
  isFavorite?: boolean;
  primaryColor?: string | null;
  code?: string | null;
  sections: BadgeCardSection[];
  footer?: string | null;
  reelIds?: string[];
};

type UpdateCardMetadataInput = {
  title: string;
  subtitle?: string | null;
  categoryName?: string | null;
  tags?: string[];
  isFavorite?: boolean;
  primaryColor?: string | null;
  reelIds?: string[];
};

type NextSortOrderRow = {
  next_sort_order: number;
};

const DEFAULT_ACCENT = "#2DD4BF";

async function getNextSortOrder(db: AppDatabase) {
  const row = await db.getFirstAsync<NextSortOrderRow>(
    "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order FROM cards",
  );
  return row?.next_sort_order ?? 0;
}

function toAssetUpsertInput(
  cardId: string,
  asset: ProcessedCardAsset,
  id?: string,
) {
  return {
    id,
    cardId,
    side: asset.side,
    fileUri: asset.fileUri,
    thumbnailUri: asset.thumbnailUri,
    displayUri: asset.displayUri,
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
    thumbnailWidth: asset.thumbnailWidth,
    thumbnailHeight: asset.thumbnailHeight,
    fileSize: asset.fileSize,
    cropDataJson: asset.cropDataJson,
  };
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
            color: input.primaryColor ?? DEFAULT_ACCENT,
          })
        : null;
      const sortOrder = await getNextSortOrder(txn);

      await createCard(txn, {
        id: cardId,
        title: input.title.trim(),
        subtitle: input.subtitle?.trim() || null,
        categoryId: category?.id ?? null,
        primaryColor: input.primaryColor ?? category?.color ?? DEFAULT_ACCENT,
        sortOrder,
        isFavorite: input.isFavorite ?? false,
        sourceType: "user_image",
        notes: null,
      });

      await upsertAsset(txn, toAssetUpsertInput(cardId, frontAsset));

      if (backAsset) {
        await upsertAsset(txn, toAssetUpsertInput(cardId, backAsset));
      }

      if (input.tags) {
        await setTagsForCard(txn, cardId, input.tags);
      }

      await setCardReels(txn, cardId, input.reelIds ?? []);
    });

    return cardId;
  } catch (error) {
    cleanupFailedImport(cardId);
    throw error;
  }
}

export async function createCardFromText(
  db: AppDatabase,
  input: CreateCardFromTextInput,
) {
  const title = input.title.trim();
  if (!title) {
    throw new Error("A card title is required.");
  }

  const sections = input.sections
    .map((section) => ({
      label: section.label.trim(),
      value: section.value.trim(),
    }))
    .filter((section) => section.label && section.value);

  if (sections.length === 0) {
    throw new Error("Add at least one text row before saving.");
  }

  const cardId = createId("card");

  await withWriteTransaction(db, async (txn) => {
    const categoryName = input.categoryName?.trim() ?? "";
    const category = categoryName
      ? await upsertCategory(txn, {
          name: categoryName,
          color: input.primaryColor ?? DEFAULT_ACCENT,
        })
      : null;
    const sortOrder = await getNextSortOrder(txn);

    await createCard(txn, {
      id: cardId,
      title,
      subtitle: input.subtitle?.trim() || null,
      categoryId: category?.id ?? null,
      primaryColor: input.primaryColor ?? category?.color ?? DEFAULT_ACCENT,
      sortOrder,
      isFavorite: input.isFavorite ?? false,
      sourceType: "user_text",
      notes: JSON.stringify({
        code: input.code?.trim() || "TEXT",
        sections,
        footer:
          input.footer?.trim() || "Reference only • verify local protocol",
      }),
    });

    if (input.tags) {
      await setTagsForCard(txn, cardId, input.tags);
    }

    await setCardReels(txn, cardId, input.reelIds ?? []);
  });

  return cardId;
}

export async function updateCardMetadata(
  db: AppDatabase,
  cardId: string,
  input: UpdateCardMetadataInput,
) {
  const title = input.title.trim();
  if (!title) {
    throw new Error("A card title is required.");
  }

  await withWriteTransaction(db, async (txn) => {
    const categoryName = input.categoryName?.trim() ?? "";
    const category = categoryName
      ? await upsertCategory(txn, {
          name: categoryName,
          color: input.primaryColor ?? DEFAULT_ACCENT,
        })
      : null;

    await updateCard(txn, cardId, {
      title,
      subtitle: input.subtitle?.trim() || null,
      categoryId: category?.id ?? null,
      primaryColor: input.primaryColor ?? category?.color ?? DEFAULT_ACCENT,
      isFavorite: input.isFavorite ?? false,
    });

    await setTagsForCard(txn, cardId, input.tags ?? []);

    if (input.reelIds) {
      await setCardReels(txn, cardId, input.reelIds);
    }
  });
}

export async function replaceCardAssetImage(
  db: AppDatabase,
  cardId: string,
  side: CardImageSide,
  image: SourceCardImage,
) {
  const existingAssets = await listAssetsForCard(db, cardId);
  const sameSideAssets = existingAssets.filter((asset) => asset.side === side);
  const existingAsset = sameSideAssets[0] ?? null;
  const duplicateAssets = sameSideAssets.slice(1);
  const processedAsset = await processAndStoreCardImage(cardId, side, image, {
    fileNamePrefix: `${side}-${createId("img")}`,
  });

  try {
    await withWriteTransaction(db, async (txn) => {
      await upsertAsset(
        txn,
        toAssetUpsertInput(cardId, processedAsset, existingAsset?.id),
      );
      for (const duplicateAsset of duplicateAssets) {
        await deleteAsset(txn, duplicateAsset.id);
      }
    });

    const keepUris = [
      processedAsset.fileUri,
      processedAsset.displayUri,
      processedAsset.thumbnailUri,
    ];
    deleteStoredCardAssetFiles(existingAsset, keepUris);
    for (const duplicateAsset of duplicateAssets) {
      deleteStoredCardAssetFiles(duplicateAsset, keepUris);
    }
  } catch (error) {
    deleteStoredCardAssetFiles(processedAsset);
    throw error;
  }
}

export async function removeCardAssetSide(
  db: AppDatabase,
  cardId: string,
  side: CardImageSide,
) {
  if (side === "front") {
    throw new Error("The front image is required. Replace it instead.");
  }

  const existingAssets = await listAssetsForCard(db, cardId);
  const matchingAssets = existingAssets.filter((asset) => asset.side === side);
  if (matchingAssets.length === 0) {
    return;
  }

  await withWriteTransaction(db, async (txn) => {
    for (const asset of matchingAssets) {
      await deleteAsset(txn, asset.id);
    }
  });

  for (const asset of matchingAssets) {
    deleteStoredCardAssetFiles(asset);
  }
}

export async function archiveCardRecord(db: AppDatabase, cardId: string) {
  await archiveCard(db, cardId);
}

export async function restoreCardRecord(db: AppDatabase, cardId: string) {
  await updateCard(db, cardId, { isArchived: false });
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
