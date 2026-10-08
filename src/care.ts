import { relativeDay } from './dates';
import { dueSummary, DueSummary } from './stats';
import { AnimalItem, CareKind } from './types';

/** The jobs an animal can need, in the order they're shown. */
export const CARE_KINDS: CareKind[] = ['feed', 'walk', 'groom', 'ride'];

export interface CareJob {
  /** The animal's history field the job is logged in. */
  field: 'feedings' | 'walks' | 'groomings' | 'rides';
  emoji: string;
  /** "Feed" – button and chip label. */
  verb: string;
  /** "Fed" – as in "Fed today". */
  past: string;
  /** Usual days between, for a new animal. */
  everyDays: number;
}

export const CARE: Record<CareKind, CareJob> = {
  feed: { field: 'feedings', emoji: '🌾', verb: 'Feed', past: 'Fed', everyDays: 1 },
  walk: { field: 'walks', emoji: '🐾', verb: 'Walk', past: 'Walked', everyDays: 1 },
  groom: { field: 'groomings', emoji: '🧼', verb: 'Groom', past: 'Groomed', everyDays: 7 },
  ride: { field: 'rides', emoji: '🏇', verb: 'Ride', past: 'Ridden', everyDays: 2 },
};

/** What a type of animal usually needs, used when adding one. */
export interface SpeciesPreset {
  name: string;
  emoji: string;
  care: CareKind[];
  careEvery: Partial<Record<CareKind, number>>;
  tracksEggs: boolean;
  /** Name placeholder. */
  example: string;
}

export const SPECIES_PRESETS: SpeciesPreset[] = [
  { name: 'Chicken', emoji: '🐔', care: ['feed'], careEvery: {}, tracksEggs: true, example: 'The Girls' },
  { name: 'Duck', emoji: '🦆', care: ['feed'], careEvery: {}, tracksEggs: true, example: 'The Ducks' },
  { name: 'Quail', emoji: '🐦', care: ['feed'], careEvery: {}, tracksEggs: true, example: 'The Quails' },
  { name: 'Dog', emoji: '🐕', care: ['feed', 'walk', 'groom'], careEvery: { groom: 7 }, tracksEggs: false, example: 'Rex' },
  { name: 'Horse', emoji: '🐴', care: ['feed', 'groom', 'ride'], careEvery: { groom: 1 }, tracksEggs: false, example: 'Storm' },
];

export function findSpecies(species: string): SpeciesPreset | undefined {
  const s = species.trim().toLowerCase();
  return SPECIES_PRESETS.find((p) => p.name.toLowerCase() === s);
}

export function speciesEmoji(species: string): string {
  return findSpecies(species)?.emoji ?? '🐾';
}

export function careEvery(animal: Pick<AnimalItem, 'careEvery'>, kind: CareKind): number {
  return animal.careEvery[kind] ?? CARE[kind].everyDays;
}

export interface CareStatus extends DueSummary {
  kind: CareKind;
  job: CareJob;
  last?: string;
  /** "Fed today", "Not walked yet". */
  lastLabel: string;
}

/** Where each of the animal's jobs stands, in display order. */
export function careStatuses(animal: AnimalItem, now: Date = new Date()): CareStatus[] {
  return CARE_KINDS.filter((k) => animal.care.includes(k)).map((kind) => {
    const job = CARE[kind];
    const last = animal[job.field][0];
    return {
      kind,
      job,
      last,
      lastLabel: last ? `${job.past} ${relativeDay(last, now)}` : `Not ${job.past.toLowerCase()} yet`,
      ...dueSummary(last, careEvery(animal, kind), now),
    };
  });
}
