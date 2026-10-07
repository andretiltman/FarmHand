export type ItemKind = 'plant' | 'animal' | 'task';

/** Sow straight into the ground, or start in a seed tray and transplant later. */
export type SowMethod = 'direct' | 'transplant';

/** A crop's journey from seed to harvest. Timings are copied from the crop catalog when added. */
export interface Growth {
  cropId: string;
  method: SowMethod;
  daysToSeedling: number;
  /** Slowest expected germination; the seedling stage only starts on its own after this. */
  daysToSeedlingMax?: number;
  /** Only used for the 'transplant' method: sowing → ready to transplant. */
  daysToTransplant: number;
  /** From seedling (direct) or from transplanting (transplant). */
  daysToHarvest: number;
  sownAt: string;
  /** How many seeds were sown. Absent for plants added before seed counts were tracked. */
  seedsSown?: number;
  /** Set when the user marks it sprouted early; otherwise the seedling stage starts on the estimated date. */
  sproutedAt?: string;
  transplantedAt?: string;
  /** How many seedlings made it to transplanting (out of `seedsSown`). */
  transplantedCount?: number;
  harvestedAt?: string;
}

export interface PlantPhoto {
  id: string;
  /** Permanent file URI on device (data: URL on web). */
  uri: string;
  takenAt: string;
  /** When it was added to FarmHand (takenAt can be set to an older date). Absent on older photos. */
  addedAt?: string;
}

/** Bookkeeping that lets two phones merge their copies of the same item (see sync.ts). */
export interface Syncable {
  /** When each field was last changed (ISO), keyed by field name – the newest change wins when syncing. */
  changed?: Record<string, string>;
  /** History entries and photos that were removed (e.g. "water:<date>", "photo:<id>"), so syncing doesn't bring them back. */
  removed?: string[];
}

export interface PlantItem extends Syncable {
  id: string;
  kind: 'plant';
  name: string;
  /** How often the plant should be watered, in days. */
  waterEveryDays: number;
  /** ISO timestamps of each watering, newest first. */
  waterings: string[];
  /** Absent for plants tracked for watering only (e.g. houseplants). */
  growth?: Growth;
  /** Progress photos, newest first. */
  photos: PlantPhoto[];
  /** e.g. "GMO-free", "Bush", "Runner". */
  tags: string[];
  createdAt: string;
}

export interface EggLog {
  /** ISO timestamp of when the eggs were collected. */
  date: string;
  count: number;
}

export interface AnimalItem extends Syncable {
  id: string;
  kind: 'animal';
  name: string;
  /** e.g. "Chicken". */
  species: string;
  /** Number of birds in this flock/entry. */
  headCount: number;
  /** Egg collections, newest first. */
  eggs: EggLog[];
  /** ISO timestamps of each feeding, newest first. */
  feedings: string[];
  createdAt: string;
}

/** A recurring maintenance job, e.g. adding bio enzymes to the septic tank. */
export interface TaskItem extends Syncable {
  id: string;
  kind: 'task';
  name: string;
  /** How often the task should be done, in days. */
  everyDays: number;
  /** ISO timestamps of each time it was done, newest first. */
  done: string[];
  createdAt: string;
}

export type TrackedItem = PlantItem | AnimalItem | TaskItem;

export type NewItem =
  | Omit<PlantItem, 'id' | 'waterings' | 'photos' | 'createdAt'>
  | Omit<AnimalItem, 'id' | 'eggs' | 'feedings' | 'createdAt'>
  | Omit<TaskItem, 'id' | 'createdAt'>;
