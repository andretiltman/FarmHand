import { photoToDataUrl } from './photoStorage';
import { PlantItem } from './types';

/** Marks a file as FarmHand plants, so we can tell it apart from any other JSON file. */
const FORMAT = 'farmhand-plants';
const VERSION = 1;

/** A plant as it travels between phones: photos are embedded as data: URLs. */
export type TransferPlant = PlantItem;

export interface TransferFile {
  format: typeof FORMAT;
  version: number;
  sentAt: string;
  plants: TransferPlant[];
}

/** Packs plants (with their full history, and optionally their photos) into a file's text. */
export async function packPlants(plants: PlantItem[], includePhotos: boolean): Promise<string> {
  const packed: TransferPlant[] = [];
  for (const plant of plants) {
    const photos = [];
    if (includePhotos) {
      for (const photo of plant.photos) {
        try {
          photos.push({ ...photo, uri: await photoToDataUrl(photo.uri) });
        } catch (e) {
          console.warn('Skipping a photo that could not be read', e);
        }
      }
    }
    packed.push({ ...plant, photos });
  }
  const file: TransferFile = { format: FORMAT, version: VERSION, sentAt: new Date().toISOString(), plants: packed };
  return JSON.stringify(file);
}

/** Reads a received file's text, throwing a friendly message if it isn't a FarmHand plants file. */
export function unpackPlants(text: string): TransferFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file isn't a FarmHand plants file.");
  }
  const file = data as Partial<TransferFile> | null;
  if (!file || file.format !== FORMAT || !Array.isArray(file.plants)) {
    throw new Error("That file isn't a FarmHand plants file.");
  }
  if ((file.version ?? 0) > VERSION) {
    throw new Error('That file was sent from a newer version of FarmHand – update the app and try again.');
  }
  const plants = file.plants.filter(
    (p) => p && p.kind === 'plant' && typeof p.name === 'string' && typeof p.waterEveryDays === 'number',
  );
  if (plants.length === 0) throw new Error('There are no plants in that file.');
  return {
    format: FORMAT,
    version: file.version ?? VERSION,
    sentAt: file.sentAt ?? '',
    plants: plants.map((p) => ({
      ...p,
      waterings: Array.isArray(p.waterings) ? p.waterings : [],
      photos: Array.isArray(p.photos) ? p.photos.filter((ph) => typeof ph?.uri === 'string' && ph.uri.startsWith('data:')) : [],
      tags: Array.isArray(p.tags) ? p.tags : [],
    })),
  };
}

/** e.g. "FarmHand - Tomato.farmhand.json" or "FarmHand - 3 plants.farmhand.json". */
export function transferFileName(plants: PlantItem[]): string {
  const label = plants.length === 1 ? plants[0].name : `${plants.length} plants`;
  const safe = label.replace(/[^\p{L}\p{N} _-]+/gu, '').trim() || 'plants';
  return `FarmHand - ${safe}.farmhand.json`;
}
