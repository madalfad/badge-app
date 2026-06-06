import { Directory, File, Paths } from "expo-file-system";

const CARDS_DIRECTORY_NAME = "cards";

type StoredCardAssetFiles = {
  fileUri?: string | null;
  displayUri?: string | null;
  thumbnailUri?: string | null;
};

function getCardsDirectory() {
  return new Directory(Paths.document, CARDS_DIRECTORY_NAME);
}

function ensureCardsDirectory() {
  const directory = getCardsDirectory();
  directory.create({ idempotent: true, intermediates: true });
  return directory;
}

function getCardDirectory(cardId: string) {
  return new Directory(getCardsDirectory(), cardId);
}

export function ensureCardDirectory(cardId: string) {
  ensureCardsDirectory();
  const directory = getCardDirectory(cardId);
  directory.create({ idempotent: true, intermediates: true });
  return directory;
}

export async function copyFileToCardDirectory(
  sourceUri: string,
  cardId: string,
  fileName: string,
) {
  const directory = ensureCardDirectory(cardId);
  const source = new File(sourceUri);
  const destination = new File(directory, fileName);
  await source.copy(destination, { overwrite: true });
  return destination.uri;
}

function deleteFileIfExists(uri: string | null | undefined) {
  if (!uri) {
    return;
  }

  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // File cleanup is best effort. Metadata updates should not fail because a
    // stale local file was already removed by the OS or user.
  }
}

export function deleteStoredCardAssetFiles(
  asset: StoredCardAssetFiles | null | undefined,
  keepUris: Array<string | null | undefined> = [],
) {
  if (!asset) {
    return;
  }

  const keep = new Set(keepUris.filter(Boolean));
  const uris = new Set([asset.fileUri, asset.displayUri, asset.thumbnailUri]);

  for (const uri of uris) {
    if (uri && !keep.has(uri)) {
      deleteFileIfExists(uri);
    }
  }
}

export function deleteCardDirectory(cardId: string) {
  try {
    const directory = getCardDirectory(cardId);
    if (directory.exists) {
      directory.delete();
    }
  } catch {
    // Directory cleanup is best effort for the same reason as individual files.
  }
}

export function deleteCardDirectoriesExcept(cardIdsToKeep: string[]) {
  try {
    const keep = new Set(cardIdsToKeep);
    const directory = getCardsDirectory();
    if (!directory.exists) {
      return;
    }

    for (const entry of directory.list()) {
      if (entry instanceof Directory && !keep.has(entry.name)) {
        entry.delete();
      }
    }
  } catch {
    // Post-restore cleanup is best effort; stale files should not invalidate a
    // successful database restore.
  }
}
