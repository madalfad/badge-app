import type { AppDatabase } from './types';

export function getDatabase(): Promise<AppDatabase>;
export function deleteDatabaseForDev(): Promise<void>;
