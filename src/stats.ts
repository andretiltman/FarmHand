import { daysBetween, isSameDay, isWithinLastDays, relativeDay } from './dates';
import { AnimalItem, PlantItem, TaskItem } from './types';

/** How a recurring job (watering, a maintenance task) stands against its schedule. */
export type DueStatus = 'never' | 'ok' | 'due' | 'overdue';
export type WaterStatus = DueStatus;

export interface DueSummary {
  status: DueStatus;
  /** Positive = days until due, 0 = due today, negative = days overdue. */
  daysUntilDue: number | null;
  dueLabel: string;
}

/** Where a job done every `everyDays` stands, given when it was last done. */
export function dueSummary(last: string | undefined, everyDays: number, now: Date = new Date()): DueSummary {
  if (!last) return { status: 'never', daysUntilDue: null, dueLabel: 'Due now' };
  const daysUntilDue = everyDays - daysBetween(new Date(last), now);
  if (daysUntilDue === 0) return { status: 'due', daysUntilDue, dueLabel: 'Due today' };
  if (daysUntilDue < 0) {
    const n = -daysUntilDue;
    return { status: 'overdue', daysUntilDue, dueLabel: `Overdue by ${n} day${n === 1 ? '' : 's'}` };
  }
  return { status: 'ok', daysUntilDue, dueLabel: daysUntilDue === 1 ? 'Due tomorrow' : `Due in ${daysUntilDue} days` };
}

export interface PlantSummary extends DueSummary {
  lastWateredLabel: string;
}

export function plantSummary(plant: PlantItem, now: Date = new Date()): PlantSummary {
  const last = plant.waterings[0];
  const due = dueSummary(last, plant.waterEveryDays, now);
  return {
    ...due,
    dueLabel: last ? due.dueLabel : 'Water now',
    lastWateredLabel: last ? `Watered ${relativeDay(last, now)}` : 'Not watered yet',
  };
}

export interface TaskSummary extends DueSummary {
  lastDoneLabel: string;
}

export function taskSummary(task: TaskItem, now: Date = new Date()): TaskSummary {
  const last = task.done[0];
  return {
    ...dueSummary(last, task.everyDays, now),
    lastDoneLabel: last ? `Done ${relativeDay(last, now)}` : 'Not done yet',
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
