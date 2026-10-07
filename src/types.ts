export type ItemKind = 'plant' | 'animal';

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
}

export interface PlantItem {
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
  createdAt: string;
}

export interface EggLog {
  /** ISO timestamp of when the eggs were collected. */
  date: string;
  count: number;
}

export interface AnimalItem {
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

export type TrackedItem = PlantItem | AnimalItem;

export type NewItem =
  | Omit<PlantItem, 'id' | 'waterings' | 'photos' | 'createdAt'>
  | Omit<AnimalItem, 'id' | 'eggs' | 'feedings' | 'createdAt'>;
