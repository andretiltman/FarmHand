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

const MIME_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/heic': 'heic', 'image/webp': 'webp' };

/** Reads a saved photo as a data: URL so it can travel inside a transfer file. */
export async function photoToDataUrl(uri: string): Promise<string> {
  const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mime = Object.keys(MIME_EXT).find((m) => MIME_EXT[m] === ext) ?? 'image/jpeg';
  return `data:${mime};base64,${await new File(uri).base64()}`;
}

/** Saves a photo received as a data: URL into app storage and returns its permanent URI. */
export async function saveDataUrlPhoto(dataUrl: string, id: string): Promise<string> {
  const match = /^data:([^;,]+);base64,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error('Not a photo');
  const dest = new File(photosDir(), `${id}.${MIME_EXT[match[1]] ?? 'jpg'}`);
  dest.write(match[2], { encoding: 'base64' });
  return dest.uri;
}
