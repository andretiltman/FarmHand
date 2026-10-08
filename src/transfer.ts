import { photoToDataUrl } from './photoStorage';
import { checkSnapshot, Deleted, isSnapshot, makeSnapshot, SyncSnapshot } from './sync';
import { Growth, PlantItem, PlantPhoto, SeedPacket, TrackedItem } from './types';

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

/** How many plants an entry holds right now (seedlings that made it once transplanted), if known. */
export function plantCount(plant: PlantItem): number | undefined {
  const g = plant.growth;
  if (!g?.seedsSown) return undefined;
  return g.transplantedAt && g.transplantedCount !== undefined ? g.transplantedCount : g.seedsSown;
}

/**
 * Splits `give` plants off an entry: the growth for the copy that's sent and for what stays here.
 * Plants lost before transplanting stay with the original, so the sent copy starts with all of its plants.
 */
export function splitGrowth(g: Growth, give: number): { sent: Growth; kept: Growth } {
  const counted = !!g.transplantedAt && g.transplantedCount !== undefined;
  return {
    sent: { ...g, seedsSown: give, transplantedCount: counted ? give : undefined },
    kept: {
      ...g,
      seedsSown: (g.seedsSown ?? give) - give,
      transplantedCount: counted ? g.transplantedCount! - give : undefined,
    },
  };
}

/** Reads photos as data: URLs so they can travel inside a file, skipping any that can't be read. */
async function embedPhotos(photos: PlantPhoto[]): Promise<PlantPhoto[]> {
  const embedded: PlantPhoto[] = [];
  for (const photo of photos) {
    try {
      embedded.push({ ...photo, uri: await photoToDataUrl(photo.uri) });
    } catch (e) {
      console.warn('Skipping a photo that could not be read', e);
    }
  }
  return embedded;
}

/** Packs plants (with their full history, and optionally their photos) into a file's text. */
export async function packPlants(plants: PlantItem[], includePhotos: boolean): Promise<string> {
  const packed: TransferPlant[] = [];
  for (const plant of plants) {
    packed.push({ ...plant, photos: includePhotos ? await embedPhotos(plant.photos) : [] });
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
    throw new Error("That file isn't from FarmHand.");
  }
  const file = data as Partial<TransferFile> | null;
  if (!file || file.format !== FORMAT || !Array.isArray(file.plants)) {
    throw new Error("That file isn't from FarmHand.");
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

/** Which photos go in a sync file: none, those added recently, or all of them (e.g. for the first sync). */
export type PhotoChoice = 'none' | 'recent' | 'all';
export const RECENT_PHOTO_DAYS = 7;

/** The photos a sync file carries for a plant. "Recent" goes by when a photo was added, not the date it shows. */
export function photosToSend(photos: PlantPhoto[], choice: PhotoChoice, now: Date = new Date()): PlantPhoto[] {
  if (choice === 'none') return [];
  if (choice === 'all') return photos;
  const since = new Date(now.getTime() - RECENT_PHOTO_DAYS * 24 * 60 * 60 * 1000).toISOString();
  return photos.filter((p) => (p.addedAt ?? p.takenAt) >= since);
}

/**
 * Packs everything on this phone into a sync file the other phone merges with theirs (see sync.ts).
 * Photos left out (e.g. older than a week) are not removed on the other phone – it just doesn't get them.
 */
export async function packSync(
  deviceId: string,
  items: TrackedItem[],
  deleted: Deleted,
  photoChoice: PhotoChoice,
): Promise<string> {
  const snapshot = makeSnapshot(deviceId, items, deleted, photoChoice !== 'none');
  if (photoChoice !== 'none') {
    snapshot.items = await Promise.all(
      snapshot.items.map(async (item) => {
        if (item.kind !== 'plant') return item;
        return { ...item, photos: await embedPhotos(photosToSend(item.photos, photoChoice)) };
      }),
    );
  }
  return JSON.stringify(snapshot);
}

/** Marks a file as FarmHand seeds from someone's seed inventory. */
const SEEDS_FORMAT = 'farmhand-seeds';
const SEEDS_VERSION = 1;

export interface SeedsFile {
  format: typeof SEEDS_FORMAT;
  version: number;
  sentAt: string;
  /** `count` is how many seeds were given; photos are embedded as data: URLs. */
  seeds: SeedPacket[];
}

/** Packs seeds (with `count` set to how many are given) and optionally their packet photos into a file's text. */
export async function packSeeds(seeds: SeedPacket[], includePhotos: boolean): Promise<string> {
  const packed: SeedPacket[] = [];
  for (const packet of seeds) {
    packed.push({ ...packet, photos: includePhotos ? await embedPhotos(packet.photos) : [] });
  }
  const file: SeedsFile = { format: SEEDS_FORMAT, version: SEEDS_VERSION, sentAt: new Date().toISOString(), seeds: packed };
  return JSON.stringify(file);
}

function checkSeeds(data: Partial<SeedsFile>): SeedsFile {
  if ((data.version ?? 0) > SEEDS_VERSION) {
    throw new Error('That file was sent from a newer version of FarmHand – update the app and try again.');
  }
  const seeds = (Array.isArray(data.seeds) ? data.seeds : []).filter(
    (s) => s && typeof s.name === 'string' && typeof s.cropId === 'string' && typeof s.count === 'number' && s.count > 0,
  );
  if (seeds.length === 0) throw new Error('There are no seeds in that file.');
  return {
    format: SEEDS_FORMAT,
    version: data.version ?? SEEDS_VERSION,
    sentAt: data.sentAt ?? '',
    seeds: seeds.map((s) => ({
      ...s,
      count: Math.round(s.count),
      photos: Array.isArray(s.photos) ? s.photos.filter((ph) => typeof ph?.uri === 'string' && ph.uri.startsWith('data:')) : [],
    })),
  };
}

/** e.g. "FarmHand seeds - Cherry tomato.farmhand.json" or "FarmHand seeds - 3 packets.farmhand.json". */
export function seedsFileName(seeds: SeedPacket[]): string {
  const label = seeds.length === 1 ? seeds[0].name : `${seeds.length} packets`;
  const safe = label.replace(/[^\p{L}\p{N} _-]+/gu, '').trim() || 'seeds';
  return `FarmHand seeds - ${safe}.farmhand.json`;
}

export type Received =
  | { kind: 'plants'; file: TransferFile }
  | { kind: 'seeds'; file: SeedsFile }
  | { kind: 'sync'; snapshot: SyncSnapshot };

/** Works out whether a received file holds plants or seeds to add, or a sync from another phone. */
export function unpackReceived(text: string): Received {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file isn't from FarmHand.");
  }
  if (isSnapshot(data)) return { kind: 'sync', snapshot: checkSnapshot(data) };
  if ((data as Partial<SeedsFile> | null)?.format === SEEDS_FORMAT) {
    return { kind: 'seeds', file: checkSeeds(data as Partial<SeedsFile>) };
  }
  return { kind: 'plants', file: unpackPlants(text) };
}

export function syncFileName(): string {
  return `FarmHand sync ${new Date().toISOString().slice(0, 10)}.farmhand.json`;
}
