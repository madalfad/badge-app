import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ensureSampleCardsSeeded } from "@/features/cards/seedSampleCards";

import { getDatabase } from "./databaseClient";
import type { AppDatabase } from "./types";

type DatabaseContextValue = {
  db: AppDatabase | null;
  isReady: boolean;
  error: Error | null;
};

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

type DatabaseProviderProps = {
  children: ReactNode;
};

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const [db, setDb] = useState<AppDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initializeDatabase() {
      try {
        const database = await getDatabase();
        await ensureSampleCardsSeeded(database);
        if (!isMounted) {
          return;
        }
        setDb(database);
        setError(null);
      } catch (caughtError) {
        if (!isMounted) {
          return;
        }
        setError(
          caughtError instanceof Error
            ? caughtError
            : new Error(String(caughtError)),
        );
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    }

    initializeDatabase();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<DatabaseContextValue>(
    () => ({ db, isReady, error }),
    [db, error, isReady],
  );

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabaseContext() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error(
      "useDatabaseContext must be used within a DatabaseProvider",
    );
  }
  return context;
}
