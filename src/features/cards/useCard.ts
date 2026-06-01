import { useCallback, useEffect, useState } from 'react';

import { listAssetsForCard } from '@/db/repositories/cardAssetsRepository';
import { getCardById } from '@/db/repositories/cardsRepository';
import { listTagsForCard } from '@/db/repositories/tagsRepository';
import { useDatabaseContext } from '@/db/DatabaseProvider';
import type { CardAssetRecord, BadgeCard } from '@/features/cards/types';

type UseCardResult = {
  card: BadgeCard | null;
  assets: CardAssetRecord[];
  tags: string[];
  isLoading: boolean;
  error: Error | null;
  isPersisted: boolean;
  reload: () => Promise<void>;
};

export function useCard(cardId: string | null): UseCardResult {
  const { db, error: databaseError, isReady } = useDatabaseContext();
  const [card, setCard] = useState<BadgeCard | null>(null);
  const [assets, setAssets] = useState<CardAssetRecord[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!isReady || !cardId) {
      setIsLoading(!isReady);
      return;
    }

    setIsLoading(true);
    try {
      if (!db) {
        setCard(null);
        setAssets([]);
        setTags([]);
        setLoadError(databaseError ?? new Error('Native database is not available on this platform.'));
        return;
      }

      const [nextCard, nextAssets, nextTags] = await Promise.all([
        getCardById(db, cardId),
        listAssetsForCard(db, cardId),
        listTagsForCard(db, cardId),
      ]);

      setCard(nextCard);
      setAssets(nextAssets);
      setTags(nextTags);
      setLoadError(nextCard ? null : new Error('Card not found.'));
    } catch (caughtError) {
      setLoadError(caughtError instanceof Error ? caughtError : new Error(String(caughtError)));
    } finally {
      setIsLoading(false);
    }
  }, [cardId, databaseError, db, isReady]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    card,
    assets,
    tags,
    isLoading: isLoading || !isReady,
    error: loadError ?? databaseError,
    isPersisted: Boolean(db),
    reload,
  };
}
