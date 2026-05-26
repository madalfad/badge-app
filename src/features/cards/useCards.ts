import { useCallback, useEffect, useState } from 'react';

import { listCards, markViewed, toggleFavorite as toggleFavoriteInDb } from '@/db/repositories/cardsRepository';
import { useDatabaseContext } from '@/db/DatabaseProvider';

import { mockBadgeCards } from '../reel/mockCards';
import type { BadgeCard } from './types';

type UseCardsResult = {
  cards: BadgeCard[];
  isLoading: boolean;
  error: Error | null;
  isPersisted: boolean;
  reload: () => Promise<void>;
  toggleFavorite: (cardId: string) => Promise<void>;
  markCardViewed: (cardId: string) => Promise<void>;
};

function toggleFavoriteInMemory(cards: BadgeCard[], cardId: string) {
  return cards.map((card) => (card.id === cardId ? { ...card, isFavorite: !card.isFavorite } : card));
}

export function useCards(): UseCardsResult {
  const { db, error: databaseError, isReady } = useDatabaseContext();
  const [cards, setCards] = useState<BadgeCard[]>([]);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!isReady) {
      return;
    }

    setIsLoading(true);
    try {
      if (!db) {
        setCards(mockBadgeCards);
        setLoadError(databaseError);
        return;
      }

      const nextCards = await listCards(db);
      setCards(nextCards.length > 0 ? nextCards : mockBadgeCards);
      setLoadError(null);
    } catch (caughtError) {
      setCards(mockBadgeCards);
      setLoadError(caughtError instanceof Error ? caughtError : new Error(String(caughtError)));
    } finally {
      setIsLoading(false);
    }
  }, [databaseError, db, isReady]);

  useEffect(() => {
    reload();
  }, [reload]);

  const toggleFavorite = useCallback(
    async (cardId: string) => {
      setCards((currentCards) => toggleFavoriteInMemory(currentCards, cardId));

      if (!db) {
        return;
      }

      try {
        await toggleFavoriteInDb(db, cardId);
      } catch (caughtError) {
        setCards((currentCards) => toggleFavoriteInMemory(currentCards, cardId));
        setLoadError(caughtError instanceof Error ? caughtError : new Error(String(caughtError)));
      }
    },
    [db],
  );

  const markCardViewed = useCallback(
    async (cardId: string) => {
      if (!db) {
        return;
      }
      await markViewed(db, cardId);
    },
    [db],
  );

  return {
    cards,
    isLoading: isLoading || !isReady,
    error: loadError ?? databaseError,
    isPersisted: Boolean(db),
    reload,
    toggleFavorite,
    markCardViewed,
  };
}
