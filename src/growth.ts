import { addDays, daysBetween, plural, relativeDay } from './dates';
import { Growth } from './types';

export type Stage = 'seed' | 'seedling' | 'growing' | 'ready' | 'harvested';
export type StageAction = 'sprouted' | 'transplanted' | 'harvested';

export interface JourneyStep {
  key: 'sown' | 'seedling' | 'transplant' | 'harvest';
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
}

function later(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

function countdown(target: Date, now: Date): number {
  return daysBetween(now, target);
}

export function growthStatus(g: Growth, now: Date = new Date()): GrowthStatus {
  const sown = new Date(g.sownAt);
  const seedlingEst = addDays(sown, g.daysToSeedling);
  const seedlingAt = g.sproutedAt ? new Date(g.sproutedAt) : seedlingEst;
  // The seedling stage starts on its own once the estimated germination time has passed.
  const isSeedling = !!g.sproutedAt || countdown(seedlingEst, now) <= 0;

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
    };
  }
  if (!isSeedling) {
    const n = countdown(seedlingEst, now);
    return {
      stage: 'seed',
      headline: `Seedling in ${plural(n, 'day')}`,
      emoji: '🌰',
      needsAction: false,
      nextAction: 'sprouted',
      steps,
    };
  }
  if (isTray && !transplantedAt) {
    const n = countdown(transplantReady, now);
    return {
      stage: 'seedling',
      headline: n > 0 ? `Transplant in ${plural(n, 'day')}` : 'Ready to transplant',
      emoji: '🌱',
      needsAction: n <= 0,
      nextAction: 'transplanted',
      steps,
    };
  }
  const n = countdown(harvestEst, now);
  if (n > 0) {
    return {
      stage: 'growing',
      headline: `Harvest in ${plural(n, 'day')}`,
      emoji: '🌿',
      needsAction: false,
      nextAction: 'harvested',
      steps,
    };
  }
  return {
    stage: 'ready',
    headline: 'Ready to harvest',
    emoji: '🧺',
    needsAction: true,
    nextAction: 'harvested',
    steps,
  };
}

