import { Directory, File, Paths } from 'expo-file-system';

// Image picker results live in a cache folder the OS may clear, so keep our own copy.
function photosDir(): Directory {
  const dir = new Directory(Paths.document, 'photos');
  dir.create({ idempotent: true, intermediates: true });
  return dir;
}

/** Copies a picked photo into app storage and returns its permanent URI. */
export async function savePhoto(pickedUri: string, id: string): Promise<string> {
  const ext = pickedUri.split('.').pop()?.toLowerCase() || 'jpg';
  const dest = new File(photosDir(), `${id}.${ext}`);
  await new File(pickedUri).copy(dest);
  return dest.uri;
}

export function deletePhoto(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (e) {
    console.warn('Failed to delete photo', e);
  }
}
