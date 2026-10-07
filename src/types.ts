export type ItemKind = 'plant' | 'animal';

export interface PlantItem {
  id: string;
  kind: 'plant';
  name: string;
  /** How often the plant should be watered, in days. */
  waterEveryDays: number;
  /** ISO timestamps of each watering, newest first. */
  waterings: string[];
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
  | Omit<PlantItem, 'id' | 'waterings' | 'createdAt'>
  | Omit<AnimalItem, 'id' | 'eggs' | 'feedings' | 'createdAt'>;
