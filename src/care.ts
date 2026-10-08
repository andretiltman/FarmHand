import { relativeDay } from './dates';
import { dueSummary, DueSummary } from './stats';
import { AnimalItem, CareKind, CareLog } from './types';

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
  /** Sizes with their usual feeding interval, for animals that eat less often as they grow (snakes). */
  sizes?: { label: string; feedEvery: number }[];
}

export const SPECIES_PRESETS: SpeciesPreset[] = [
  { name: 'Chicken', emoji: '🐔', care: ['feed'], careEvery: {}, tracksEggs: true, example: 'The Girls' },
  { name: 'Duck', emoji: '🦆', care: ['feed'], careEvery: {}, tracksEggs: true, example: 'The Ducks' },
  { name: 'Quail', emoji: '🐦', care: ['feed'], careEvery: {}, tracksEggs: true, example: 'The Quails' },
  { name: 'Dog', emoji: '🐕', care: ['feed', 'walk', 'groom'], careEvery: { groom: 7 }, tracksEggs: false, example: 'Rex' },
  { name: 'Horse', emoji: '🐴', care: ['feed', 'groom', 'ride'], careEvery: { groom: 1 }, tracksEggs: false, example: 'Storm' },
  {
    name: 'Snake',
    emoji: '🐍',
    care: ['feed'],
    careEvery: { feed: 7 },
    tracksEggs: false,
    example: 'Noodle',
    sizes: [
      { label: 'Hatchling', feedEvery: 5 },
      { label: 'Juvenile', feedEvery: 7 },
      { label: 'Sub-adult', feedEvery: 10 },
      { label: 'Adult', feedEvery: 14 },
      { label: 'Large adult', feedEvery: 21 },
    ],
  },
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
  /** When every animal had last had it done – for named animals, the one waiting longest. */
  last?: string;
  /** "Fed today", "Not walked yet", or "Walk Harley" when only some named animals are due. */
  lastLabel: string;
  /** Named animals the job is due for (all of them when it's due for everyone). */
  dueFor: string[];
}

/** Whether a log entry included this named animal. */
export const includes = (log: CareLog, name: string) => !log.who || log.who.includes(name);

/** Where each of the animal's jobs stands, in display order. Named animals are tracked one by one. */
export function careStatuses(animal: AnimalItem, now: Date = new Date()): CareStatus[] {
  return CARE_KINDS.filter((k) => animal.care.includes(k)).map((kind) => {
    const job = CARE[kind];
    const every = careEvery(animal, kind);
    const logs = animal[job.field];
    let last: string | undefined;
    let dueFor: string[] = [];
    if (animal.names.length > 1) {
      const lastFor = animal.names.map((name) => ({ name, last: logs.find((l) => includes(l, name))?.date }));
      last = lastFor.some((n) => !n.last) ? undefined : lastFor.map((n) => n.last!).sort()[0];
      dueFor = lastFor.filter((n) => dueSummary(n.last, every, now).status !== 'ok').map((n) => n.name);
    } else {
      last = logs[0]?.date;
    }
    const due = dueSummary(last, every, now);
    return {
      kind,
      job,
      last,
      lastLabel:
        dueFor.length && dueFor.length < animal.names.length
          ? `${job.verb} ${joinNames(dueFor)}`
          : last
            ? `${job.past} ${relativeDay(last, now)}`
            : `Not ${job.past.toLowerCase()} yet`,
      dueFor: due.status === 'ok' ? [] : dueFor,
      ...due,
    };
  });
}

/** "Annie", "Annie and Harley", "Annie, Harley and Max". */
export function joinNames(names: string[]): string {
  return names.length < 2 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** "Fed", "Fed all" or "Walked Annie and Harley". */
export function careLogText(job: CareJob, log: CareLog, names: string[]): string {
  if (log.who) return `${job.past} ${joinNames(log.who)}`;
  return names.length > 1 ? `${job.past} all` : job.past;
}
