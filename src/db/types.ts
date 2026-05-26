export type SQLiteRunResultLike = {
  changes: number;
  lastInsertRowId: number;
};

export type AppDatabase = {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, ...params: unknown[]): Promise<SQLiteRunResultLike>;
  getFirstAsync<T>(source: string, ...params: unknown[]): Promise<T | null>;
  getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]>;
  withTransactionAsync?(task: () => Promise<void>): Promise<void>;
  withExclusiveTransactionAsync?(task: (txn: AppDatabase) => Promise<void>): Promise<void>;
};

export async function withWriteTransaction(
  db: AppDatabase,
  task: (txn: AppDatabase) => Promise<void>,
) {
  if (db.withExclusiveTransactionAsync) {
    await db.withExclusiveTransactionAsync(async (txn) => {
      await task(txn);
    });
    return;
  }

  if (db.withTransactionAsync) {
    await db.withTransactionAsync(async () => {
      await task(db);
    });
    return;
  }

  await task(db);
}
