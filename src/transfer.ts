import { photoToDataUrl } from './photoStorage';
import { checkSnapshot, Deleted, isSnapshot, makeSnapshot, SyncSnapshot } from './sync';
import { AnimalItem, CareLog, Growth, PlantItem, PlantPhoto, SeedPacket, TaskItem, TrackedItem } from './types';

/** Marks a file as FarmHand items (plants, animals, tasks and seeds), so we can tell it apart from any other JSON file. */
const FORMAT = 'farmhand-plants';
/** Version 1 files only held plants; version 2 added animals, tasks and seeds. */
const VERSION = 2;

/** A plant as it travels between phones: photos are embedded as data: URLs. */
export type TransferPlant = PlantItem;

export interface TransferFile {
  format: typeof FORMAT;
  version: number;
  sentAt: string;
  plants: TransferPlant[];
  animals: AnimalItem[];
  tasks: TaskItem[];
  /** `count` is how many seeds were given; packet photos are embedded as data: URLs. */
  seeds: SeedPacket[];
}

/** What's ticked to send. */
export interface TransferPick {
  plants: PlantItem[];
  animals: AnimalItem[];
  tasks: TaskItem[];
  seeds: SeedPacket[];
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

/** Which of an animal entry's care logs are about the given animals, mentioning only them. */
function logsFor(logs: CareLog[], names: string[]): CareLog[] {
  return logs.flatMap((log) => {
    if (!log.who) return [log];
    const who = log.who.filter((n) => names.includes(n));
    if (who.length === 0) return [];
    return [who.length === names.length ? { date: log.date } : { ...log, who }];
  });
}

/** What stays here when only some of an entry's animals are given away. */
export type KeptAnimals = Pick<AnimalItem, 'headCount' | 'names'>;

/**
 * Splits animals off an entry: the named animals in `give`, or a number of them for unnamed animals.
 * The sent copy keeps the history (only the care logged for the animals it holds); what stays here
 * just has fewer animals.
 */
export function splitAnimal(animal: AnimalItem, give: string[] | number): { sent: AnimalItem; kept: KeptAnimals } {
  if (typeof give === 'number') {
    return { sent: { ...animal, headCount: give }, kept: { headCount: animal.headCount - give, names: [] } };
  }
  const rest = animal.names.filter((n) => !give.includes(n));
  return {
    sent: {
      ...animal,
      names: give,
      headCount: give.length,
      feedings: logsFor(animal.feedings, give),
      walks: logsFor(animal.walks, give),
      groomings: logsFor(animal.groomings, give),
      rides: logsFor(animal.rides, give),
    },
    kept: { headCount: rest.length, names: rest },
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

/**
 * Packs plants, animals and tasks (with their full history) and seeds (with `count` set to how many are given),
 * optionally with plant and packet photos, into a file's text.
 */
export async function packItems(pick: TransferPick, includePhotos: boolean): Promise<string> {
  const plants: TransferPlant[] = [];
  for (const plant of pick.plants) {
    plants.push({ ...plant, photos: includePhotos ? await embedPhotos(plant.photos) : [] });
  }
  const seeds: SeedPacket[] = [];
  for (const packet of pick.seeds) {
    seeds.push({ ...packet, photos: includePhotos ? await embedPhotos(packet.photos) : [] });
  }
  const file: TransferFile = {
    format: FORMAT,
    // Plants-only files stay readable by older versions of the app.
    version: pick.animals.length || pick.tasks.length || seeds.length ? VERSION : 1,
    sentAt: new Date().toISOString(),
    plants,
    animals: pick.animals,
    tasks: pick.tasks,
    seeds,
  };
  return JSON.stringify(file);
}

const receivedPhotos = (photos: unknown): PlantPhoto[] =>
  Array.isArray(photos) ? photos.filter((ph) => typeof ph?.uri === 'string' && ph.uri.startsWith('data:')) : [];

const receivedSeeds = (seeds: unknown): SeedPacket[] =>
  (Array.isArray(seeds) ? (seeds as SeedPacket[]) : [])
    .filter((s) => s && typeof s.name === 'string' && typeof s.cropId === 'string' && typeof s.count === 'number' && s.count > 0)
    .map((s) => ({ ...s, count: Math.round(s.count), photos: receivedPhotos(s.photos) }));

function checkItems(file: Partial<TransferFile>): TransferFile {
  if ((file.version ?? 0) > VERSION) {
    throw new Error('That file was sent from a newer version of FarmHand – update the app and try again.');
  }
  const plants = (Array.isArray(file.plants) ? file.plants : []).filter(
    (p) => p && p.kind === 'plant' && typeof p.name === 'string' && typeof p.waterEveryDays === 'number',
  );
  const animals = (Array.isArray(file.animals) ? file.animals : []).filter(
    (a) => a && a.kind === 'animal' && typeof a.name === 'string' && typeof a.headCount === 'number',
  );
  const tasks = (Array.isArray(file.tasks) ? file.tasks : []).filter(
    (t) => t && t.kind === 'task' && typeof t.name === 'string' && typeof t.everyDays === 'number',
  );
  const seeds = receivedSeeds(file.seeds);
  if (plants.length + animals.length + tasks.length + seeds.length === 0) throw new Error("There's nothing to add in that file.");
  return {
    format: FORMAT,
    version: file.version ?? VERSION,
    sentAt: file.sentAt ?? '',
    plants: plants.map((p) => ({
      ...p,
      waterings: Array.isArray(p.waterings) ? p.waterings : [],
      photos: receivedPhotos(p.photos),
      tags: Array.isArray(p.tags) ? p.tags : [],
    })),
    animals: animals.map((a) => ({
      ...a,
      species: typeof a.species === 'string' ? a.species : a.name,
      names: Array.isArray(a.names) ? a.names : [],
    })),
    tasks: tasks.map((t) => ({ ...t, done: Array.isArray(t.done) ? t.done : [] })),
    seeds,
  };
}

/** e.g. "FarmHand - Tomato.farmhand.json", "FarmHand - 3 plants.farmhand.json" or "FarmHand - 5 items.farmhand.json". */
export function transferFileName({ plants, animals, tasks, seeds }: TransferPick): string {
  const total = plants.length + animals.length + tasks.length + seeds.length;
  const label =
    total === 1
      ? [...plants, ...animals, ...tasks, ...seeds][0].name
      : total === plants.length
        ? `${total} plants`
        : total === seeds.length
          ? `${total} seed packets`
          : `${total} items`;
  const safe = label.replace(/[^\p{L}\p{N} _-]+/gu, '').trim() || 'items';
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

/** Seeds used to travel in a file of their own; still accepted when received. */
const SEEDS_FORMAT = 'farmhand-seeds';

export type Received = { kind: 'items'; file: TransferFile } | { kind: 'sync'; snapshot: SyncSnapshot };

/** Works out whether a received file holds plants, animals, tasks or seeds to add, or a sync from another phone. */
export function unpackReceived(text: string): Received {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file isn't from FarmHand.");
  }
  if (isSnapshot(data)) return { kind: 'sync', snapshot: checkSnapshot(data) };
  const file = data as (Omit<Partial<TransferFile>, 'format'> & { format?: string }) | null;
  if (file?.format === SEEDS_FORMAT) {
    return { kind: 'items', file: checkItems({ ...file, format: FORMAT, version: undefined, plants: [], animals: [], tasks: [] }) };
  }
  if (!file || file.format !== FORMAT) throw new Error("That file isn't from FarmHand.");
  return { kind: 'items', file: checkItems({ ...file, format: FORMAT }) };
}

export function syncFileName(): string {
  return `FarmHand sync ${new Date().toISOString().slice(0, 10)}.farmhand.json`;
}
