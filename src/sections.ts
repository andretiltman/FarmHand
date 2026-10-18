import { careStatuses } from './care';
import { growthStatus } from './growth';
import { batchStatus, inputsDue } from './natural';
import { plantSummary, taskSummary } from './stats';
import { TrackedItem } from './types';

export type SectionKey =
  | 'overview'
  | 'all'
  | 'sown'
  | 'seedlings'
  | 'harvest'
  | 'plants'
  | 'inputs'
  | 'animals'
  | 'maintenance';

export interface Section {
  key: SectionKey;
  label: string;
  emoji: string;
  /** Shown when the section has nothing in it. */
  emptyTitle: string;
  emptyText: string;
  /** `ready`: the natural inputs there's a batch of ready to use (see natural.ts). */
  includes: (item: TrackedItem, now: Date, ready: Set<string>) => boolean;
}

/**
 * True when a plant needs watering, transplanting, harvesting or natural inputs, an animal is due a feed, walk, …,
 * a task is due, or a batch of natural inputs is ready for its next step.
 */
export function needsAttention(item: TrackedItem, now: Date = new Date(), ready: Set<string> = new Set()): boolean {
  if (item.kind === 'animal') return careStatuses(item, now).some((c) => c.status !== 'ok');
  if (item.kind === 'task') return taskSummary(item, now).status !== 'ok';
  if (item.kind === 'input') return batchStatus(item, now).needsAction;
  const g = item.growth ? growthStatus(item.growth, now) : null;
  if (g?.stage === 'harvested') return false;
  if (g?.needsAction) return true;
  if (inputsDue(item, ready, now).length) return true;
  return plantSummary(item, now).status !== 'ok';
}

function plantStage(item: TrackedItem, now: Date) {
  return item.kind === 'plant' && item.growth ? growthStatus(item.growth, now).stage : null;
}

export const sections: Section[] = [
  {
    key: 'overview',
    label: 'Overview',
    emoji: '⭐',
    emptyTitle: 'All caught up',
    emptyText:
      'Nothing needs watering, natural inputs, transplanting, harvesting, feeding, walking, grooming, cleaning out or maintenance right now.',
    includes: needsAttention,
  },
  {
    key: 'all',
    label: 'All',
    emoji: '📋',
    emptyTitle: 'Nothing tracked yet',
    emptyText: 'Tap “Add” below to start tracking a plant, your animals or a maintenance job.',
    includes: () => true,
  },
  {
    key: 'sown',
    label: 'Seeds',
    emoji: '🌰',
    emptyTitle: 'No seeds waiting',
    emptyText: 'Seeds you sow show up here until they sprout.',
    includes: (item, now) => plantStage(item, now) === 'seed',
  },
  {
    key: 'seedlings',
    label: 'Seedlings',
    emoji: '🌱',
    emptyTitle: 'No seedlings',
    emptyText: 'Sprouted seedlings show up here until they are transplanted or big enough to stand on their own.',
    includes: (item, now) => plantStage(item, now) === 'seedling',
  },
  {
    key: 'harvest',
    label: 'Harvest',
    emoji: '🧺',
    emptyTitle: 'Nothing growing yet',
    emptyText: 'Crops you grew from seed show up here once they are past the seedling stage.',
    includes: (item, now) => {
      const stage = plantStage(item, now);
      return !!stage && stage !== 'seed' && stage !== 'seedling';
    },
  },
  {
    key: 'plants',
    label: 'Plants',
    emoji: '🪴',
    emptyTitle: 'No plants yet',
    emptyText: 'Houseplants, trees and other plants you water show up here (crops grown from seed are under Harvest).',
    includes: (item) => item.kind === 'plant' && !item.growth,
  },
  {
    key: 'inputs',
    label: 'Inputs',
    emoji: '🧪',
    emptyTitle: 'No natural inputs',
    emptyText: 'Tap “Add” below to start a batch of LAB, calcium vinegar (WCA) or another natural farming input.',
    includes: (item) => item.kind === 'input',
  },
  {
    key: 'animals',
    label: 'Animals',
    emoji: '🐾',
    emptyTitle: 'No animals yet',
    emptyText: 'Tap “Add” below to start tracking your chickens, dogs, horses or snakes.',
    includes: (item) => item.kind === 'animal',
  },
  {
    key: 'maintenance',
    label: 'Maintenance',
    emoji: '🛠️',
    emptyTitle: 'No maintenance tasks',
    emptyText: 'Tap “Add” below to set up a recurring job, like adding bio enzymes to the septic tank.',
    includes: (item) => item.kind === 'task',
  },
];

/** The groups the overview is split into, so it reads e.g. "🌰 Seeds 3" (each item is in exactly one). */
export const overviewGroups: Section[] = sections.filter((s) => s.key !== 'overview' && s.key !== 'all');
