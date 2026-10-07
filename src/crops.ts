import { SowMethod } from './types';

export interface Crop {
  id: string;
  name: string;
  emoji: string;
  /** How we suggest starting it. */
  recommended: SowMethod;
  /** One-line tip shown when choosing how to sow. */
  tip: string;
  /** Sowing → seedling (sprouted with first true leaves). */
  daysToSeedling: number;
  /** Sowing → big enough to transplant, when started in a seed tray. */
  daysToTransplant: number;
  /** Days to harvest, counted from seedling (direct) or from transplanting (tray). */
  daysToHarvest: number;
  waterEveryDays: number;
}

// Rough averages for typical varieties – real timings vary with variety, season and climate.
export const CROPS: Crop[] = [
  { id: 'corn', name: 'Corn', emoji: '🌽', recommended: 'direct', tip: "Corn doesn't like its roots disturbed – sow it straight into the ground.", daysToSeedling: 10, daysToTransplant: 21, daysToHarvest: 75, waterEveryDays: 3 },
  { id: 'beans', name: 'Beans', emoji: '🫘', recommended: 'direct', tip: 'Beans grow fast and transplant poorly – sow them directly.', daysToSeedling: 8, daysToTransplant: 18, daysToHarvest: 50, waterEveryDays: 3 },
  { id: 'peas', name: 'Peas', emoji: '🫛', recommended: 'direct', tip: 'Peas prefer to be sown directly where they will climb.', daysToSeedling: 10, daysToTransplant: 21, daysToHarvest: 55, waterEveryDays: 3 },
  { id: 'carrot', name: 'Carrot', emoji: '🥕', recommended: 'direct', tip: 'Root crops fork if transplanted – always sow carrots directly.', daysToSeedling: 14, daysToTransplant: 28, daysToHarvest: 60, waterEveryDays: 2 },
  { id: 'radish', name: 'Radish', emoji: '🔴', recommended: 'direct', tip: 'Radishes are quick and best sown directly.', daysToSeedling: 5, daysToTransplant: 14, daysToHarvest: 22, waterEveryDays: 2 },
  { id: 'beetroot', name: 'Beetroot', emoji: '🟣', recommended: 'direct', tip: 'Beetroot does best sown directly into loose soil.', daysToSeedling: 10, daysToTransplant: 28, daysToHarvest: 50, waterEveryDays: 3 },
  { id: 'spinach', name: 'Spinach', emoji: '🍃', recommended: 'direct', tip: 'Spinach is easy to sow directly in rows.', daysToSeedling: 8, daysToTransplant: 28, daysToHarvest: 40, waterEveryDays: 2 },
  { id: 'sunflower', name: 'Sunflower', emoji: '🌻', recommended: 'direct', tip: 'Sunflowers have a long taproot – sow them directly.', daysToSeedling: 8, daysToTransplant: 21, daysToHarvest: 70, waterEveryDays: 3 },
  { id: 'pumpkin', name: 'Pumpkin', emoji: '🎃', recommended: 'direct', tip: 'Sow directly once the soil is warm, or start in pots to get ahead.', daysToSeedling: 8, daysToTransplant: 21, daysToHarvest: 90, waterEveryDays: 3 },
  { id: 'zucchini', name: 'Zucchini', emoji: '🥒', recommended: 'direct', tip: 'Sow directly once the soil is warm, or start in pots to get ahead.', daysToSeedling: 7, daysToTransplant: 21, daysToHarvest: 45, waterEveryDays: 2 },
  { id: 'cucumber', name: 'Cucumber', emoji: '🥒', recommended: 'direct', tip: 'Sow directly once the soil is warm, or start in pots to get ahead.', daysToSeedling: 7, daysToTransplant: 21, daysToHarvest: 50, waterEveryDays: 2 },
  { id: 'watermelon', name: 'Watermelon', emoji: '🍉', recommended: 'direct', tip: 'Sow directly in warm soil, or start in pots to get ahead.', daysToSeedling: 8, daysToTransplant: 21, daysToHarvest: 80, waterEveryDays: 3 },
  { id: 'lettuce', name: 'Lettuce', emoji: '🥬', recommended: 'direct', tip: 'Lettuce can be sown directly or started in trays – both work well.', daysToSeedling: 7, daysToTransplant: 28, daysToHarvest: 45, waterEveryDays: 2 },
  { id: 'tomato', name: 'Tomato', emoji: '🍅', recommended: 'transplant', tip: 'Start tomatoes in a seed tray and transplant when they are sturdy.', daysToSeedling: 8, daysToTransplant: 42, daysToHarvest: 70, waterEveryDays: 2 },
  { id: 'pepper', name: 'Pepper / Chilli', emoji: '🌶️', recommended: 'transplant', tip: 'Peppers are slow starters – begin them in a seed tray.', daysToSeedling: 12, daysToTransplant: 56, daysToHarvest: 75, waterEveryDays: 2 },
  { id: 'eggplant', name: 'Eggplant', emoji: '🍆', recommended: 'transplant', tip: 'Start eggplant in a seed tray somewhere warm.', daysToSeedling: 10, daysToTransplant: 56, daysToHarvest: 75, waterEveryDays: 2 },
  { id: 'cabbage', name: 'Cabbage', emoji: '🥬', recommended: 'transplant', tip: 'Start cabbage in trays and transplant to give it a head start.', daysToSeedling: 8, daysToTransplant: 35, daysToHarvest: 70, waterEveryDays: 3 },
  { id: 'broccoli', name: 'Broccoli', emoji: '🥦', recommended: 'transplant', tip: 'Start broccoli in trays and transplant when it has 4–6 leaves.', daysToSeedling: 8, daysToTransplant: 35, daysToHarvest: 65, waterEveryDays: 3 },
  { id: 'onion', name: 'Onion', emoji: '🧅', recommended: 'transplant', tip: 'Raise onion seedlings in a tray, then plant them out.', daysToSeedling: 12, daysToTransplant: 56, daysToHarvest: 100, waterEveryDays: 3 },
  { id: 'basil', name: 'Basil', emoji: '🌿', recommended: 'transplant', tip: 'Start basil in a tray and plant out once nights are warm.', daysToSeedling: 8, daysToTransplant: 35, daysToHarvest: 30, waterEveryDays: 2 },
];

export function findCrop(id: string | undefined): Crop | undefined {
  return CROPS.find((c) => c.id === id);
}
