import { daysBetween, isSameDay, isWithinLastDays, relativeDay } from './dates';
import { AnimalItem, PlantItem } from './types';

export type WaterStatus = 'never' | 'ok' | 'due' | 'overdue';

export interface PlantSummary {
  status: WaterStatus;
  /** Positive = days until due, 0 = due today, negative = days overdue. */
  daysUntilDue: number | null;
  lastWateredLabel: string;
  dueLabel: string;
}

export function plantSummary(plant: PlantItem, now: Date = new Date()): PlantSummary {
  const last = plant.waterings[0];
  if (!last) {
    return {
      status: 'never',
      daysUntilDue: null,
      lastWateredLabel: 'Not watered yet',
      dueLabel: 'Water now',
    };
  }
  const daysUntilDue = plant.waterEveryDays - daysBetween(new Date(last), now);
  let status: WaterStatus = 'ok';
  let dueLabel = daysUntilDue === 1 ? 'Due tomorrow' : `Due in ${daysUntilDue} days`;
  if (daysUntilDue === 0) {
    status = 'due';
    dueLabel = 'Due today';
  } else if (daysUntilDue < 0) {
    status = 'overdue';
    const n = -daysUntilDue;
    dueLabel = `Overdue by ${n} day${n === 1 ? '' : 's'}`;
  }
  return {
    status,
    daysUntilDue,
    lastWateredLabel: `Watered ${relativeDay(last, now)}`,
    dueLabel,
  };
}

export interface AnimalSummary {
  today: number;
  last7Days: number;
  total: number;
  lastFedLabel: string;
  /** False when the animals haven't been fed yet today. */
  fedToday: boolean;
}

export function animalSummary(animal: AnimalItem, now: Date = new Date()): AnimalSummary {
  let today = 0;
  let last7Days = 0;
  let total = 0;
  for (const log of animal.eggs) {
    total += log.count;
    if (isSameDay(log.date, now)) today += log.count;
    if (isWithinLastDays(log.date, 7, now)) last7Days += log.count;
  }
  const lastFed = animal.feedings[0];
  return {
    today,
    last7Days,
    total,
    lastFedLabel: lastFed ? `Fed ${relativeDay(lastFed, now)}` : 'Not fed yet',
    fedToday: !!lastFed && isSameDay(lastFed, now),
  };
}
