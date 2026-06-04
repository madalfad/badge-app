import { useCallback, useEffect, useMemo, useState } from "react";

import { listCards } from "@/db/repositories/cardsRepository";
import {
  archiveReel,
  createReel,
  deleteReel,
  listReels,
  reorderReels,
  updateReel,
} from "@/db/repositories/reelsRepository";
import { useDatabaseContext } from "@/db/DatabaseProvider";
import { sampleBadgeCards } from "@/features/reel/sampleCards";
import { useStringSetting } from "@/features/settings/useStringSetting";

import {
  ALL_REELS_SETTING_VALUE,
  DEFAULT_REEL_COLOR,
  DEFAULT_REEL_ICON,
  DEFAULT_REEL_ID,
  DEFAULT_REEL_NAME,
  SELECTED_REEL_SETTING_KEY,
} from "./constants";
import type { CreateReelInput, ReelRecord, UpdateReelInput } from "./types";

type UseReelsResult = {
  reels: ReelRecord[];
  selectedReelId: string | null;
  selectedReel: ReelRecord | null;
  allActiveCardCount: number;
  isLoading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
  selectReel: (reelId: string | null) => Promise<void>;
  createNewReel: (input: CreateReelInput) => Promise<string>;
  updateExistingReel: (reelId: string, patch: UpdateReelInput) => Promise<void>;
  archiveExistingReel: (reelId: string) => Promise<void>;
  deleteExistingReel: (reelId: string) => Promise<void>;
  moveReel: (reelId: string, direction: -1 | 1) => Promise<void>;
};

function createFallbackReel(): ReelRecord {
  const now = new Date().toISOString();
  return {
    id: DEFAULT_REEL_ID,
    name: DEFAULT_REEL_NAME,
    color: DEFAULT_REEL_COLOR,
    icon: DEFAULT_REEL_ICON,
    sortOrder: 0,
    isArchived: false,
    activeCardCount: sampleBadgeCards.length,
    totalCardCount: sampleBadgeCards.length,
    createdAt: now,
    updatedAt: now,
  };
}

function toSelectedReelId(settingValue: string) {
  return settingValue === ALL_REELS_SETTING_VALUE ? null : settingValue;
}

function toSettingValue(reelId: string | null) {
  return reelId ?? ALL_REELS_SETTING_VALUE;
}

function swapReelOrder(reels: ReelRecord[], reelId: string, direction: -1 | 1) {
  const currentIndex = reels.findIndex((reel) => reel.id === reelId);
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= reels.length) {
    return reels;
  }

  const nextReels = [...reels];
  const currentReel = nextReels[currentIndex];
  nextReels[currentIndex] = nextReels[nextIndex];
  nextReels[nextIndex] = currentReel;
  return nextReels;
}

export function useReels(): UseReelsResult {
  const { db, error: databaseError, isReady } = useDatabaseContext();
  const [selectedSetting, setSelectedSetting, isSelectionLoaded] =
    useStringSetting(SELECTED_REEL_SETTING_KEY, DEFAULT_REEL_ID);
  const [reels, setReels] = useState<ReelRecord[]>([]);
  const [allActiveCardCount, setAllActiveCardCount] = useState(0);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const selectedReelId = toSelectedReelId(selectedSetting);
  const selectedReel = useMemo(
    () => reels.find((reel) => reel.id === selectedReelId) ?? null,
    [reels, selectedReelId],
  );

  const reload = useCallback(async () => {
    if (!isReady) {
      return;
    }

    setIsLoading(true);
    try {
      if (!db) {
        setReels([createFallbackReel()]);
        setAllActiveCardCount(sampleBadgeCards.length);
        setLoadError(databaseError);
        return;
      }

      const [nextReels, activeCards] = await Promise.all([
        listReels(db),
        listCards(db),
      ]);
      setReels(nextReels.length > 0 ? nextReels : [createFallbackReel()]);
      setAllActiveCardCount(activeCards.length);
      setLoadError(null);
    } catch (caughtError) {
      setReels([createFallbackReel()]);
      setAllActiveCardCount(sampleBadgeCards.length);
      setLoadError(
        caughtError instanceof Error
          ? caughtError
          : new Error(String(caughtError)),
      );
    } finally {
      setIsLoading(false);
    }
  }, [databaseError, db, isReady]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const hasSelectedReel = reels.some((reel) => reel.id === selectedReelId);
    if (!isSelectionLoaded || !selectedReelId || hasSelectedReel) {
      return;
    }
    setSelectedSetting(DEFAULT_REEL_ID).catch(() => undefined);
  }, [isSelectionLoaded, reels, selectedReelId, setSelectedSetting]);

  const selectReel = useCallback(
    async (reelId: string | null) => {
      await setSelectedSetting(toSettingValue(reelId));
    },
    [setSelectedSetting],
  );

  const createNewReel = useCallback(
    async (input: CreateReelInput) => {
      if (!db) {
        throw new Error("Native storage is required to create reels.");
      }

      const reelId = await createReel(db, input);
      await reload();
      await selectReel(reelId);
      return reelId;
    },
    [db, reload, selectReel],
  );

  const updateExistingReel = useCallback(
    async (reelId: string, patch: UpdateReelInput) => {
      if (!db) {
        throw new Error("Native storage is required to update reels.");
      }

      await updateReel(db, reelId, patch);
      await reload();
    },
    [db, reload],
  );

  const archiveExistingReel = useCallback(
    async (reelId: string) => {
      if (!db) {
        throw new Error("Native storage is required to archive reels.");
      }

      await archiveReel(db, reelId);
      if (selectedReelId === reelId) {
        await selectReel(DEFAULT_REEL_ID);
      }
      await reload();
    },
    [db, reload, selectReel, selectedReelId],
  );

  const deleteExistingReel = useCallback(
    async (reelId: string) => {
      if (!db) {
        throw new Error("Native storage is required to delete reels.");
      }

      await deleteReel(db, reelId);
      if (selectedReelId === reelId) {
        await selectReel(DEFAULT_REEL_ID);
      }
      await reload();
    },
    [db, reload, selectReel, selectedReelId],
  );

  const moveReel = useCallback(
    async (reelId: string, direction: -1 | 1) => {
      if (!db) {
        throw new Error("Native storage is required to reorder reels.");
      }

      const nextReels = swapReelOrder(reels, reelId, direction);
      await reorderReels(
        db,
        nextReels.map((reel) => reel.id),
      );
      await reload();
    },
    [db, reels, reload],
  );

  return {
    reels,
    selectedReelId,
    selectedReel,
    allActiveCardCount,
    isLoading: isLoading || !isReady || !isSelectionLoaded,
    error: loadError,
    reload,
    selectReel,
    createNewReel,
    updateExistingReel,
    archiveExistingReel,
    deleteExistingReel,
    moveReel,
  };
}
