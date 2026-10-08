import { careStatuses } from './care';
import { growthStatus } from './growth';
import { plantSummary, taskSummary } from './stats';
import { TrackedItem } from './types';

export type SectionKey = 'overview' | 'all' | 'sown' | 'seedlings' | 'plants' | 'animals' | 'maintenance';

export interface Section {
  key: SectionKey;
  label: string;
  emoji: string;
  /** Shown when the section has nothing in it. */
  emptyTitle: string;
  emptyText: string;
  includes: (item: TrackedItem, now: Date) => boolean;
}

/** True when a plant needs watering, transplanting or harvesting, an animal is due a feed, walk, … or a task is due. */
export function needsAttention(item: TrackedItem, now: Date = new Date()): boolean {
  if (item.kind === 'animal') return careStatuses(item, now).some((c) => c.status !== 'ok');
  if (item.kind === 'task') return taskSummary(item, now).status !== 'ok';
  const g = item.growth ? growthStatus(item.growth, now) : null;
  if (g?.stage === 'harvested') return false;
  if (g?.needsAction) return true;
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
    emptyText: 'Nothing needs watering, transplanting, harvesting, feeding, walking, grooming, cleaning out or maintenance right now.',
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
    label: 'Sown',
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
    key: 'plants',
    label: 'Plants',
    emoji: '🪴',
    emptyTitle: 'No plants yet',
    emptyText: 'Growing and established plants show up here.',
    includes: (item, now) => {
      if (item.kind !== 'plant') return false;
      const stage = plantStage(item, now);
      return stage !== 'seed' && stage !== 'seedling';
    },
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
