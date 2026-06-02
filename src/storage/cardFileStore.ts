import { Directory, File, Paths } from "expo-file-system";

const CARDS_DIRECTORY_NAME = "cards";

type StoredCardAssetFiles = {
  fileUri?: string | null;
  displayUri?: string | null;
  thumbnailUri?: string | null;
};

export function getCardsDirectory() {
  return new Directory(Paths.document, CARDS_DIRECTORY_NAME);
}

export function ensureCardsDirectory() {
  const directory = getCardsDirectory();
  directory.create({ idempotent: true, intermediates: true });
  return directory;
}

export function getCardDirectory(cardId: string) {
  return new Directory(getCardsDirectory(), cardId);
}

export function ensureCardDirectory(cardId: string) {
  ensureCardsDirectory();
  const directory = getCardDirectory(cardId);
  directory.create({ idempotent: true, intermediates: true });
  return directory;
}

export function getCardFile(cardId: string, fileName: string) {
  return new File(getCardDirectory(cardId), fileName);
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

export function deleteFileIfExists(uri: string | null | undefined) {
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
