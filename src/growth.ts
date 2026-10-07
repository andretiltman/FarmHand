import { addDays, daysBetween, formatDays, relativeDay } from './dates';
import { Crop } from './crops';
import { Growth } from './types';

export type Stage = 'seed' | 'seedling' | 'growing' | 'ready' | 'harvested';
export type StageAction = 'sprouted' | 'transplanted' | 'harvested';

export type MilestoneKey = 'sown' | 'seedling' | 'transplant' | 'harvest';

export interface JourneyStep {
  key: MilestoneKey;
  label: string;
  emoji: string;
  date: Date;
  /** True when the date is a prediction rather than something that happened. */
  estimated: boolean;
  done: boolean;
}

export interface GrowthStatus {
  stage: Stage;
  /** e.g. "Seedling in 7 days". */
  headline: string;
  emoji: string;
  /** True when the user should do something (transplant or harvest). */
  needsAction: boolean;
  /** The next milestone the user can confirm, if any. */
  nextAction: StageAction | null;
  steps: JourneyStep[];
  /** The date the harvest countdown is measured from. */
  harvestFrom: Date;
}

function later(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

function clamp(d: Date, min: Date, max: Date): Date {
  return d < min ? min : d > max ? max : d;
}

function countdown(target: Date, now: Date): number {
  return daysBetween(now, target);
}

export function growthStatus(g: Growth, now: Date = new Date()): GrowthStatus {
  const sown = new Date(g.sownAt);
  const seedlingEst = addDays(sown, g.daysToSeedling);
  // Slow, variable germinators (e.g. strawberries: 7 days to 8 weeks) get a window before we assume they sprouted.
  const seedlingLatest = addDays(sown, Math.max(g.daysToSeedling, g.daysToSeedlingMax ?? 0));
  const seedlingAt = g.sproutedAt ? new Date(g.sproutedAt) : clamp(now, seedlingEst, seedlingLatest);
  // The seedling stage starts on its own once the (latest) expected germination time has passed.
  const isSeedling = !!g.sproutedAt || countdown(seedlingLatest, now) <= 0;

  const isTray = g.method === 'transplant';
  const transplantReady = addDays(sown, g.daysToTransplant);
  const transplantedAt = g.transplantedAt ? new Date(g.transplantedAt) : null;

  // Harvest is counted from the seedling stage for direct sowing, and only from
  // transplanting for tray-started crops (estimated from "ready to transplant" until then).
  const harvestFrom = isTray ? (transplantedAt ?? later(transplantReady, now)) : seedlingAt;
  const harvestEst = addDays(harvestFrom, g.daysToHarvest);
  const harvestedAt = g.harvestedAt ? new Date(g.harvestedAt) : null;

  const steps: JourneyStep[] = [
    { key: 'sown', label: 'Sown', emoji: '🌰', date: sown, estimated: false, done: true },
    { key: 'seedling', label: 'Seedling', emoji: '🌱', date: seedlingAt, estimated: !g.sproutedAt, done: isSeedling },
  ];
  if (isTray) {
    steps.push({
      key: 'transplant',
      label: 'Transplant',
      emoji: '🪴',
      date: transplantedAt ?? transplantReady,
      estimated: !transplantedAt,
      done: !!transplantedAt,
    });
  }
  steps.push({
    key: 'harvest',
    label: 'Harvest',
    emoji: '🧺',
    date: harvestedAt ?? harvestEst,
    estimated: !harvestedAt,
    done: !!harvestedAt,
  });

  if (harvestedAt) {
    return {
      stage: 'harvested',
      headline: `Harvested ${relativeDay(g.harvestedAt!, now)}`,
      emoji: '✅',
      needsAction: false,
      nextAction: null,
      steps,
      harvestFrom,
    };
  }
  if (!isSeedling) {
    const n = countdown(seedlingEst, now);
    return {
      stage: 'seed',
      headline: n > 0 ? `Seedling in ${g.daysToSeedlingMax ? '~' : ''}${formatDays(n)}` : 'Should sprout any day',
      emoji: '🌰',
      needsAction: false,
      nextAction: 'sprouted',
      steps,
      harvestFrom,
    };
  }
  if (isTray && !transplantedAt) {
    const n = countdown(transplantReady, now);
    return {
      stage: 'seedling',
      headline: n > 0 ? `Transplant in ${formatDays(n)}` : 'Ready to transplant',
      emoji: '🌱',
      needsAction: n <= 0,
      nextAction: 'transplanted',
      steps,
      harvestFrom,
    };
  }
  const n = countdown(harvestEst, now);
  // Direct-sown crops are still young seedlings until they'd be big enough to transplant.
  if (!isTray && n > 0 && countdown(transplantReady, now) > 0) {
    return {
      stage: 'seedling',
      headline: `Harvest in ${formatDays(n)}`,
      emoji: '🌱',
      needsAction: false,
      nextAction: 'harvested',
      steps,
      harvestFrom,
    };
  }
  if (n > 0) {
    return {
      stage: 'growing',
      headline: `Harvest in ${formatDays(n)}`,
      emoji: '🌿',
      needsAction: false,
      nextAction: 'harvested',
      steps,
      harvestFrom,
    };
  }
  return {
    stage: 'ready',
    headline: 'Ready to harvest',
    emoji: '🧺',
    needsAction: true,
    nextAction: 'harvested',
    steps,
    harvestFrom,
  };
}

function atNoon(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
}

/**
 * Which dates a milestone can be moved to. Dates must stay in order, sowing can't be in the future,
 * and a milestone whose previous step hasn't happened yet can only get a new (future) estimate.
 */
export function milestoneBounds(steps: JourneyStep[], key: MilestoneKey, now: Date = new Date()) {
  const i = steps.findIndex((s) => s.key === key);
  const prev = steps[i - 1];
  const next = steps[i + 1];
  const tomorrow = addDays(atNoon(now), 1);
  let min: Date | undefined;
  let max: Date | undefined;
  if (prev) min = prev.done ? prev.date : later(tomorrow, addDays(prev.date, 1));
  if (next?.done && !next.estimated) max = next.date;
  if (key === 'sown' && (!max || max > now)) max = now;
  return { min, max };
}

/**
 * Moves a milestone to `date`. Today or earlier records that it happened then; a future date
 * changes this plant's expected timing (e.g. for a faster or slower variety).
 */
export function setMilestoneDate(g: Growth, key: MilestoneKey, date: Date, now: Date = new Date()): Growth {
  const at = atNoon(date).toISOString();
  const happened = daysBetween(date, now) >= 0;
  const sown = new Date(g.sownAt);
  switch (key) {
    case 'sown':
      return { ...g, sownAt: at };
    case 'seedling':
      return happened
        ? { ...g, sproutedAt: at }
        : { ...g, sproutedAt: undefined, daysToSeedling: daysBetween(sown, date), daysToSeedlingMax: undefined };
    case 'transplant':
      return happened
        ? { ...g, transplantedAt: at }
        : { ...g, transplantedAt: undefined, daysToTransplant: daysBetween(sown, date) };
    case 'harvest':
      return happened
        ? { ...g, harvestedAt: at }
        : { ...g, harvestedAt: undefined, daysToHarvest: daysBetween(growthStatus(g, now).harvestFrom, date) };
  }
}

/** True when a milestone has a recorded date or a timing that differs from the crop's usual one. */
export function isCustomized(g: Growth, key: MilestoneKey, crop: Crop | undefined): boolean {
  switch (key) {
    case 'sown':
      return false;
    case 'seedling':
      return !!g.sproutedAt || (!!crop && g.daysToSeedling !== crop.daysToSeedling);
    case 'transplant':
      return !!g.transplantedAt || (!!crop && g.daysToTransplant !== crop.daysToTransplant);
    case 'harvest':
      return !!g.harvestedAt || (!!crop && g.daysToHarvest !== crop.daysToHarvest);
  }
}

/** Clears a recorded date and goes back to the crop's usual timing for that milestone. */
export function resetMilestone(g: Growth, key: MilestoneKey, crop: Crop | undefined): Growth {
  switch (key) {
    case 'sown':
      return g;
    case 'seedling':
      return {
        ...g,
        sproutedAt: undefined,
        daysToSeedling: crop?.daysToSeedling ?? g.daysToSeedling,
        daysToSeedlingMax: crop ? crop.guide.germinationDays?.[1] : g.daysToSeedlingMax,
      };
    case 'transplant':
      return {
        ...g,
        transplantedAt: undefined,
        transplantedCount: undefined,
        daysToTransplant: crop?.daysToTransplant ?? g.daysToTransplant,
      };
    case 'harvest':
      return { ...g, harvestedAt: undefined, daysToHarvest: crop?.daysToHarvest ?? g.daysToHarvest };
  }
}

export interface TransplantSuccess {
  sown: number;
  transplanted: number;
  /** Whole-number percentage of seeds that made it to transplanting. */
  percent: number;
}

/** How many of the sown seeds made it to transplanting, once both counts are known. */
export function transplantSuccess(g: Growth): TransplantSuccess | null {
  if (g.method !== 'transplant' || !g.transplantedAt || !g.seedsSown || g.transplantedCount === undefined) return null;
  const transplanted = Math.min(g.transplantedCount, g.seedsSown);
  return { sown: g.seedsSown, transplanted, percent: Math.round((transplanted / g.seedsSown) * 100) };
}
