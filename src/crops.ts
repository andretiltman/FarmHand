import { Season } from './seasons';
import { SowMethod } from './types';

export interface GrowingGuide {
  /** Seasons in which to sow. */
  sow: Season[];
  depthMm: number;
  /** Between plants in a row, and between rows. */
  spacingCm: { plant: number; row: number };
  /** Soil temperature range for germination, °C. */
  germinationC: [number, number];
  /** Fastest–slowest germination, for crops that vary a lot. The seedling stage won't start on its own before the slowest. */
  germinationDays?: [number, number];
  /** Anything special, e.g. cold stratification. */
  note?: string;
}

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
  guide: GrowingGuide;
}

// Rough averages for typical varieties – real timings vary with variety, season and climate.
export const CROPS: Crop[] = [
  { id: 'corn', name: 'Corn', emoji: '🌽', recommended: 'direct', tip: "Corn doesn't like its roots disturbed – sow it straight into the ground.", daysToSeedling: 10, daysToTransplant: 21, daysToHarvest: 75, waterEveryDays: 3,
    guide: { sow: ['spring', 'summer'], depthMm: 25, spacingCm: { plant: 25, row: 75 }, germinationC: [18, 30] } },
  { id: 'beans', name: 'Beans', emoji: '🫘', recommended: 'direct', tip: 'Beans grow fast and transplant poorly – sow them directly.', daysToSeedling: 8, daysToTransplant: 18, daysToHarvest: 50, waterEveryDays: 3,
    guide: { sow: ['spring', 'summer'], depthMm: 25, spacingCm: { plant: 10, row: 45 }, germinationC: [18, 30] } },
  { id: 'peas', name: 'Peas', emoji: '🫛', recommended: 'direct', tip: 'Peas prefer to be sown directly where they will climb.', daysToSeedling: 10, daysToTransplant: 21, daysToHarvest: 55, waterEveryDays: 3,
    guide: { sow: ['autumn', 'winter', 'spring'], depthMm: 25, spacingCm: { plant: 5, row: 45 }, germinationC: [10, 24] } },
  { id: 'carrot', name: 'Carrot', emoji: '🥕', recommended: 'direct', tip: 'Root crops fork if transplanted – always sow carrots directly.', daysToSeedling: 14, daysToTransplant: 28, daysToHarvest: 60, waterEveryDays: 2,
    guide: { sow: ['spring', 'summer', 'autumn'], depthMm: 6, spacingCm: { plant: 5, row: 30 }, germinationC: [10, 25] } },
  { id: 'radish', name: 'Radish', emoji: '🔴', recommended: 'direct', tip: 'Radishes are quick and best sown directly.', daysToSeedling: 5, daysToTransplant: 14, daysToHarvest: 22, waterEveryDays: 2,
    guide: { sow: ['spring', 'autumn', 'winter'], depthMm: 12, spacingCm: { plant: 5, row: 25 }, germinationC: [10, 30] } },
  { id: 'beetroot', name: 'Beetroot', emoji: '🟣', recommended: 'direct', tip: 'Beetroot does best sown directly into loose soil.', daysToSeedling: 10, daysToTransplant: 28, daysToHarvest: 50, waterEveryDays: 3,
    guide: { sow: ['spring', 'summer', 'autumn'], depthMm: 12, spacingCm: { plant: 10, row: 30 }, germinationC: [10, 30] } },
  { id: 'spinach', name: 'Spinach', emoji: '🍃', recommended: 'direct', tip: 'Spinach is easy to sow directly in rows.', daysToSeedling: 8, daysToTransplant: 28, daysToHarvest: 40, waterEveryDays: 2,
    guide: { sow: ['autumn', 'winter', 'spring'], depthMm: 12, spacingCm: { plant: 15, row: 30 }, germinationC: [7, 24] } },
  { id: 'sunflower', name: 'Sunflower', emoji: '🌻', recommended: 'direct', tip: 'Sunflowers have a long taproot – sow them directly.', daysToSeedling: 8, daysToTransplant: 21, daysToHarvest: 70, waterEveryDays: 3,
    guide: { sow: ['spring', 'summer'], depthMm: 25, spacingCm: { plant: 45, row: 75 }, germinationC: [18, 30] } },
  { id: 'pumpkin', name: 'Pumpkin', emoji: '🎃', recommended: 'direct', tip: 'Sow directly once the soil is warm, or start in pots to get ahead.', daysToSeedling: 8, daysToTransplant: 21, daysToHarvest: 90, waterEveryDays: 3,
    guide: { sow: ['spring', 'summer'], depthMm: 25, spacingCm: { plant: 100, row: 200 }, germinationC: [20, 35] } },
  { id: 'zucchini', name: 'Zucchini', emoji: '🥒', recommended: 'direct', tip: 'Sow directly once the soil is warm, or start in pots to get ahead.', daysToSeedling: 7, daysToTransplant: 21, daysToHarvest: 45, waterEveryDays: 2,
    guide: { sow: ['spring', 'summer'], depthMm: 25, spacingCm: { plant: 60, row: 100 }, germinationC: [20, 35] } },
  { id: 'cucumber', name: 'Cucumber', emoji: '🥒', recommended: 'direct', tip: 'Sow directly once the soil is warm, or start in pots to get ahead.', daysToSeedling: 7, daysToTransplant: 21, daysToHarvest: 50, waterEveryDays: 2,
    guide: { sow: ['spring', 'summer'], depthMm: 15, spacingCm: { plant: 30, row: 100 }, germinationC: [20, 35] } },
  { id: 'watermelon', name: 'Watermelon', emoji: '🍉', recommended: 'direct', tip: 'Sow directly in warm soil, or start in pots to get ahead.', daysToSeedling: 8, daysToTransplant: 21, daysToHarvest: 80, waterEveryDays: 3,
    guide: { sow: ['spring', 'summer'], depthMm: 25, spacingCm: { plant: 100, row: 200 }, germinationC: [22, 35] } },
  { id: 'lettuce', name: 'Lettuce', emoji: '🥬', recommended: 'direct', tip: 'Lettuce can be sown directly or started in trays – both work well.', daysToSeedling: 7, daysToTransplant: 28, daysToHarvest: 45, waterEveryDays: 2,
    guide: { sow: ['spring', 'autumn'], depthMm: 6, spacingCm: { plant: 25, row: 30 }, germinationC: [10, 24], note: 'Lettuce bolts in hot weather – give it afternoon shade in summer.' } },
  { id: 'rocket', name: 'Rocket', emoji: '🥗', recommended: 'direct', tip: 'Rocket is fast and easy – sow it directly and pick leaves young.', daysToSeedling: 6, daysToTransplant: 21, daysToHarvest: 25, waterEveryDays: 2,
    guide: { sow: ['autumn', 'winter', 'spring'], depthMm: 6, spacingCm: { plant: 15, row: 30 }, germinationC: [10, 25], note: 'Rocket bolts and turns peppery in hot weather – sow small batches every 2–3 weeks for a steady supply.' } },
  { id: 'tomato', name: 'Tomato', emoji: '🍅', recommended: 'transplant', tip: 'Start tomatoes in a seed tray and transplant when they are sturdy.', daysToSeedling: 8, daysToTransplant: 42, daysToHarvest: 70, waterEveryDays: 2,
    guide: { sow: ['spring', 'summer'], depthMm: 6, spacingCm: { plant: 50, row: 100 }, germinationC: [20, 30] } },
  { id: 'pepper', name: 'Pepper / Chilli', emoji: '🌶️', recommended: 'transplant', tip: 'Peppers are slow starters – begin them in a seed tray.', daysToSeedling: 12, daysToTransplant: 56, daysToHarvest: 75, waterEveryDays: 2,
    guide: { sow: ['spring', 'summer'], depthMm: 6, spacingCm: { plant: 45, row: 60 }, germinationC: [22, 32] } },
  { id: 'eggplant', name: 'Eggplant', emoji: '🍆', recommended: 'transplant', tip: 'Start eggplant in a seed tray somewhere warm.', daysToSeedling: 10, daysToTransplant: 56, daysToHarvest: 75, waterEveryDays: 2,
    guide: { sow: ['spring', 'summer'], depthMm: 6, spacingCm: { plant: 50, row: 75 }, germinationC: [22, 32] } },
  { id: 'cabbage', name: 'Cabbage', emoji: '🥬', recommended: 'transplant', tip: 'Start cabbage in trays and transplant to give it a head start.', daysToSeedling: 8, daysToTransplant: 35, daysToHarvest: 70, waterEveryDays: 3,
    guide: { sow: ['spring', 'summer', 'autumn'], depthMm: 10, spacingCm: { plant: 45, row: 60 }, germinationC: [10, 30] } },
  { id: 'broccoli', name: 'Broccoli', emoji: '🥦', recommended: 'transplant', tip: 'Start broccoli in trays and transplant when it has 4–6 leaves.', daysToSeedling: 8, daysToTransplant: 35, daysToHarvest: 65, waterEveryDays: 3,
    guide: { sow: ['summer', 'autumn'], depthMm: 10, spacingCm: { plant: 45, row: 60 }, germinationC: [10, 30] } },
  { id: 'onion', name: 'Onion', emoji: '🧅', recommended: 'transplant', tip: 'Raise onion seedlings in a tray, then plant them out.', daysToSeedling: 12, daysToTransplant: 56, daysToHarvest: 100, waterEveryDays: 3,
    guide: { sow: ['autumn', 'winter'], depthMm: 6, spacingCm: { plant: 10, row: 30 }, germinationC: [10, 25] } },
  { id: 'basil', name: 'Basil', emoji: '🌿', recommended: 'transplant', tip: 'Start basil in a tray and plant out once nights are warm.', daysToSeedling: 8, daysToTransplant: 35, daysToHarvest: 30, waterEveryDays: 2,
    guide: { sow: ['spring', 'summer'], depthMm: 6, spacingCm: { plant: 25, row: 40 }, germinationC: [20, 30] } },
  { id: 'strawberry', name: 'Strawberry', emoji: '🍓', recommended: 'transplant', tip: 'Strawberry seed is tiny and slow – start it in a seed tray and plant out once seedlings are sturdy.', daysToSeedling: 21, daysToTransplant: 84, daysToHarvest: 645, waterEveryDays: 2,
    guide: { sow: ['spring', 'summer'], depthMm: 3, spacingCm: { plant: 60, row: 120 }, germinationC: [18, 26], germinationDays: [7, 56], note: 'Cold stratification required: keep the seeds in the fridge for 3–4 weeks before sowing.' } },
  { id: 'cannabis', name: 'Cannabis', emoji: '🌿', recommended: 'transplant', tip: 'Start in small pots and plant out after ~3 weeks. Outdoors it flowers as the days shorten, so plan to harvest in autumn.', daysToSeedling: 5, daysToTransplant: 21, daysToHarvest: 130, waterEveryDays: 2,
    guide: { sow: ['spring'], depthMm: 10, spacingCm: { plant: 100, row: 150 }, germinationC: [20, 30], germinationDays: [3, 10], note: 'Only female plants produce buds – unless you use feminised seed, remove males once they show (around 4–6 weeks). Autoflowering varieties finish much faster (~10–12 weeks from seed).' } },
];

export function findCrop(id: string | undefined): Crop | undefined {
  return CROPS.find((c) => c.id === id);
}
