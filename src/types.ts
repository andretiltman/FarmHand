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
  /** Sowing → ready to transplant. For direct sowing, how long the plant counts as a seedling. */
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

/** A packet (or jar) of seeds on hand, not yet sown. Kept on this phone only (not synced). */
export interface SeedPacket {
  id: string;
  /** Crop catalog id, or "other". */
  cropId: string;
  /** e.g. "Cherry tomato" – defaults to the crop's name. */
  name: string;
  count: number;
  /** Photos of the packet, newest first. */
  photos: PlantPhoto[];
  addedAt: string;
}

export interface EggLog {
  /** ISO timestamp of when the eggs were collected. */
  date: string;
  count: number;
}

/** A job an animal needs doing regularly (see care.ts). */
export type CareKind = 'feed' | 'walk' | 'groom' | 'ride' | 'clean';

/** One feeding, walk, grooming, ride or clean-out. */
export interface CareLog {
  /** ISO timestamp. */
  date: string;
  /** The named animals it was done for; absent when it was done for all of them. */
  who?: string[];
}

export interface AnimalItem extends Syncable {
  id: string;
  kind: 'animal';
  name: string;
  /** e.g. "Chicken", "Dog", "Horse". */
  species: string;
  /** Number of animals in this flock/entry. */
  headCount: number;
  /** Their names, e.g. ["Annie", "Harley"], so you can log a walk for just some of them. Optional. */
  names: string[];
  /** The jobs tracked for this animal, e.g. feed, walk and groom for a dog. */
  care: CareKind[];
  /** How often each job is due, in days; jobs left out use their usual timing. */
  careEvery: Partial<Record<CareKind, number>>;
  /** Whether egg collections are tracked (chickens, ducks, …). */
  tracksEggs: boolean;
  /** Egg collections, newest first. */
  eggs: EggLog[];
  /** Each feeding, walk, grooming, ride and clean-out of the coop or stable, newest first. */
  feedings: CareLog[];
  walks: CareLog[];
  groomings: CareLog[];
  rides: CareLog[];
  cleanings: CareLog[];
  /** Photos of the animals, newest first. */
  photos: PlantPhoto[];
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

/** Items that can have photos. */
export type PhotoItem = PlantItem | AnimalItem;

export const hasPhotos = (item: TrackedItem): item is PhotoItem => item.kind !== 'task';

export type NewItem =
  | Omit<PlantItem, 'id' | 'waterings' | 'photos' | 'createdAt'>
  | Omit<AnimalItem, 'id' | 'eggs' | 'feedings' | 'walks' | 'groomings' | 'rides' | 'cleanings' | 'photos' | 'createdAt'>
  | Omit<TaskItem, 'id' | 'createdAt'>;
