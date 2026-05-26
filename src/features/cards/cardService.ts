import {
  archiveCard,
  createCard,
  deleteCard,
  markViewed,
  toggleFavorite,
  updateCard,
} from '@/db/repositories/cardsRepository';
import type { AppDatabase } from '@/db/types';
import type { CreateCardInput, UpdateCardInput } from '@/features/cards/types';
import { deleteCardDirectory, ensureCardDirectory } from '@/storage/cardFileStore';

export async function createCardRecord(db: AppDatabase, input: CreateCardInput) {
  const cardId = await createCard(db, input);
  ensureCardDirectory(cardId);
  return cardId;
}

export async function updateCardRecord(db: AppDatabase, cardId: string, patch: UpdateCardInput) {
  await updateCard(db, cardId, patch);
}

export async function archiveCardRecord(db: AppDatabase, cardId: string) {
  await archiveCard(db, cardId);
}

export async function deleteCardRecordAndFiles(db: AppDatabase, cardId: string) {
  await deleteCard(db, cardId);
  deleteCardDirectory(cardId);
}

export async function toggleCardFavorite(db: AppDatabase, cardId: string) {
  await toggleFavorite(db, cardId);
}

export async function markCardAsViewed(db: AppDatabase, cardId: string) {
  await markViewed(db, cardId);
}
