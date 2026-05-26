import { Directory, File, Paths } from 'expo-file-system';

const CARDS_DIRECTORY_NAME = 'cards';

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

export async function copyFileToCardDirectory(sourceUri: string, cardId: string, fileName: string) {
  const directory = ensureCardDirectory(cardId);
  const source = new File(sourceUri);
  const destination = new File(directory, fileName);
  await source.copy(destination, { overwrite: true });
  return destination.uri;
}

export function deleteCardDirectory(cardId: string) {
  const directory = getCardDirectory(cardId);
  if (directory.exists) {
    directory.delete();
  }
}
