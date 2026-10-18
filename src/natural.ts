import { findCrop } from './crops';
import { addDays, daysBetween, formatDays } from './dates';
import { growthStatus } from './growth';
import { dueSummary, DueStatus } from './stats';
import { InputItem, PlantItem, TrackedItem } from './types';

/**
 * Korean Natural Farming (KNF) inputs: home-made ferments and extracts like lactic acid bacteria (LAB) and
 * water-soluble calcium from eggshells in vinegar (WCA).
 *
 * Batches are made step by step (e.g. LAB: rice wash → add milk → harvest the serum) and, once ready, are
 * diluted in water and given to plants. KNF feeds a plant what suits its stage of growth:
 *  - Vegetative growth (seedlings and leafy growth): LAB, FPJ.
 *  - Changeover (the week or two before flowering): WCAP, WCA – calcium to switch from leaves to flowers.
 *  - Flowering & fruiting: WCA, FFJ.
 * LAB suits every stage. Timings and dilutions are the usual ones; recipes vary between growers.
 */

export type FeedStage = 'vegetative' | 'changeover' | 'fruiting';

export const FEED_STAGES: Record<FeedStage, { label: string; emoji: string; about: string }> = {
  vegetative: { label: 'Vegetative growth', emoji: '🌿', about: 'Growing leaves, stems and roots' },
  changeover: { label: 'Changeover', emoji: '🔄', about: 'Getting ready to flower' },
  fruiting: { label: 'Flowering & fruiting', emoji: '🌼', about: 'Flowering, setting and ripening fruit' },
};

export interface RecipeStep {
  /** What to do, e.g. "Add milk" – also the button label. */
  title: string;
  /** How it reads in the history once done, e.g. "Milk added". */
  done: string;
  how: string;
}

export interface Recipe {
  id: string;
  /** e.g. "Lactic acid bacteria". */
  name: string;
  /** e.g. "LAB". */
  short: string;
  emoji: string;
  about: string;
  steps: RecipeStep[];
  /** Usual days to wait before each step after the first. */
  waits: number[];
  /** 1 part to this many parts of water. */
  dilution: number;
  /** The stages of growth it's given at. */
  stages: FeedStage[];
  /** How to use and keep it. */
  use: string;
}

export const RECIPES: Recipe[] = [
  {
    id: 'lab',
    name: 'Lactic acid bacteria',
    short: 'LAB',
    emoji: '🥛',
    about: 'Beneficial bacteria that liven up the soil, help plants take up nutrients and keep smells down.',
    steps: [
      {
        title: 'Start',
        done: 'Rice wash set aside',
        how: 'Rinse rice in water and keep the cloudy water. Fill a jar about ⅔ full, cover it with paper (not a lid) and leave it somewhere cool and shady.',
      },
      {
        title: 'Add milk',
        done: 'Milk added',
        how: 'After 3–7 days it smells sour and separates into layers. Take the cloudy middle layer and mix 1 part of it into 10 parts milk. Cover with paper again.',
      },
      {
        title: 'Harvest the serum',
        done: 'Serum harvested',
        how: 'After 5–7 days curds float on top. Lift them off (compost them or feed them to the chickens) and keep the yellow serum underneath – that\'s your LAB.',
      },
    ],
    waits: [5, 7],
    dilution: 1000,
    stages: ['vegetative', 'changeover', 'fruiting'],
    use: 'Water onto the soil or spray on the leaves, at any stage. Keep the serum in the fridge, or mix it 1:1 with molasses or brown sugar to keep it at room temperature. It\'s also used in animals\' drinking water and on coop bedding.',
  },
  {
    id: 'wca',
    name: 'Water-soluble calcium',
    short: 'WCA',
    emoji: '🥚',
    about: 'Calcium from eggshells dissolved in vinegar. Helps plants switch from leafy growth to flowering, and firms up fruit.',
    steps: [
      {
        title: 'Start',
        done: 'Eggshells in vinegar',
        how: 'Rinse eggshells, dry them and roast them in a pan until lightly browned. Crush and add 1 part shells to 10 parts brown rice vinegar (or another natural vinegar). It fizzes – cover loosely with paper, never a tight lid.',
      },
      {
        title: 'Strain',
        done: 'Strained',
        how: 'When the bubbling stops (about 7–14 days), strain off the liquid. It keeps for months in a cool, dark place.',
      },
    ],
    waits: [10],
    dilution: 1000,
    stages: ['changeover', 'fruiting'],
    use: 'Spray on the leaves or water onto the soil from just before flowering, and while fruit is setting.',
  },
  {
    id: 'wcap',
    name: 'Water-soluble calcium phosphate',
    short: 'WCAP',
    emoji: '🦴',
    about: 'Calcium and phosphate from bones dissolved in vinegar. Given just before flowering to help plants set flowers.',
    steps: [
      {
        title: 'Start',
        done: 'Bones in vinegar',
        how: 'Boil bones to get rid of meat and fat, then char them over a fire until brown-black (not ash). Add 1 part bones to 10 parts brown rice vinegar and cover loosely with paper.',
      },
      {
        title: 'Strain',
        done: 'Strained',
        how: 'When the bubbling stops (about 10–14 days), strain off the liquid and keep it somewhere cool and dark.',
      },
    ],
    waits: [14],
    dilution: 1000,
    stages: ['changeover'],
    use: 'Spray on the leaves or water onto the soil during the changeover, in the week or two before flowering.',
  },
  {
    id: 'fpj',
    name: 'Fermented plant juice',
    short: 'FPJ',
    emoji: '🌱',
    about: 'Growth hormones and nutrients from fast-growing plant tips. Boosts leafy growth.',
    steps: [
      {
        title: 'Start',
        done: 'Packed with sugar',
        how: 'Before sunrise, pick vigorous growing tips (e.g. comfrey, mugwort, sweet potato tips, bamboo shoots) – don\'t wash them. Weigh them, mix with the same weight of brown sugar and pack into a jar about ⅔ full. Cover with paper.',
      },
      {
        title: 'Strain',
        done: 'Strained',
        how: 'After 5–7 days, strain off the liquid. Keep it with a loose lid somewhere cool and dark.',
      },
    ],
    waits: [7],
    dilution: 500,
    stages: ['vegetative'],
    use: 'Spray on the leaves or water onto the soil during leafy growth. Use it weaker (1:1000) on young seedlings.',
  },
  {
    id: 'ffj',
    name: 'Fermented fruit juice',
    short: 'FFJ',
    emoji: '🍌',
    about: 'Sugars and nutrients from ripe fruit. Helps flowering and sweetens fruit.',
    steps: [
      {
        title: 'Start',
        done: 'Packed with sugar',
        how: 'Chop ripe, sweet fruit (banana, papaya, mango, grapes), mix with the same weight of brown sugar and pack into a jar about ⅔ full. Cover with paper.',
      },
      {
        title: 'Strain',
        done: 'Strained',
        how: 'After about a week, strain off the liquid. Keep it with a loose lid somewhere cool and dark.',
      },
    ],
    waits: [7],
    dilution: 1000,
    stages: ['fruiting'],
    use: 'Spray on the leaves or water onto the soil while flowering and fruiting.',
  },
];

/** Recipe id for an input of your own, e.g. OHN or FAA. */
export const OTHER_INPUT = 'other';
export const OTHER_READY_DAYS = 7;

export function findRecipe(id: string | undefined): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}

/** A batch's recipe – your own inputs get a simple start → finish. */
export function batchRecipe(batch: InputItem): Recipe {
  return (
    findRecipe(batch.recipeId) ?? {
      id: OTHER_INPUT,
      name: batch.name,
      short: batch.name,
      emoji: '🧪',
      about: '',
      steps: [
        { title: 'Start', done: 'Started', how: '' },
        { title: 'Finish', done: 'Finished', how: '' },
      ],
      waits: [OTHER_READY_DAYS],
      dilution: 1000,
      stages: [],
      use: '',
    }
  );
}

/** "1 ml per litre (1:1000)". */
export function dilutionText(dilution: number): string {
  const ml = Math.round((1000 / dilution) * 10) / 10;
  return `${ml} ml per litre (1:${dilution})`;
}

// ---- Batches ---------------------------------------------------------------------------------------------

export type BatchState = 'brewing' | 'due' | 'ready' | 'usedUp';

export interface BatchStatus {
  state: BatchState;
  recipe: Recipe;
  /** The next step to do; undefined once ready. */
  next?: RecipeStep;
  nextIndex: number;
  /** When the next step is due. */
  dueAt: Date | null;
  /** e.g. "Add milk in 3 days", "Time to strain", "Ready to use". */
  headline: string;
  needsAction: boolean;
}

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

export function batchStatus(batch: InputItem, now: Date = new Date()): BatchStatus {
  const recipe = batchRecipe(batch);
  const nextIndex = batch.stepsDone.length;
  if (batch.usedUpAt) return { state: 'usedUp', recipe, nextIndex, dueAt: null, headline: 'Used up', needsAction: false };
  const next = recipe.steps[nextIndex];
  if (!next) return { state: 'ready', recipe, nextIndex, dueAt: null, headline: 'Ready to use', needsAction: false };
  const last = batch.stepsDone[nextIndex - 1];
  const wait = batch.waits[nextIndex - 1] ?? recipe.waits[nextIndex - 1] ?? 0;
  const dueAt = addDays(new Date(last), wait);
  const n = daysBetween(now, dueAt);
  if (n > 0) {
    return { state: 'brewing', recipe, next, nextIndex, dueAt, headline: `${next.title} in ${formatDays(n)}`, needsAction: false };
  }
  return { state: 'due', recipe, next, nextIndex, dueAt, headline: `Time to ${lowerFirst(next.title)}`, needsAction: true };
}

/** When each step was done or is expected, for the batch's timeline. */
export function batchSteps(batch: InputItem): { step: RecipeStep; date: Date; done: boolean }[] {
  const recipe = batchRecipe(batch);
  let date = new Date(batch.stepsDone[0]);
  return recipe.steps.map((step, i) => {
    if (batch.stepsDone[i]) date = new Date(batch.stepsDone[i]);
    else date = addDays(date, batch.waits[i - 1] ?? recipe.waits[i - 1] ?? 0);
    return { step, date, done: !!batch.stepsDone[i] };
  });
}

/** What a batch is given as: its recipe id, or "other:<name>" for your own inputs. */
export function inputKey(batch: InputItem): string {
  return batch.recipeId === OTHER_INPUT || !findRecipe(batch.recipeId) ? `${OTHER_INPUT}:${batch.name}` : batch.recipeId;
}

/** "LAB", or the name of your own input. */
export function inputLabel(key: string): string {
  return findRecipe(key)?.short ?? key.replace(/^other:/, '');
}

export function inputEmoji(key: string): string {
  return findRecipe(key)?.emoji ?? '🧪';
}

/** The inputs you have a batch of ready to use, by key. */
export function readyInputs(items: TrackedItem[], now: Date = new Date()): Set<string> {
  const ready = new Set<string>();
  for (const i of items) if (i.kind === 'input' && batchStatus(i, now).state === 'ready') ready.add(inputKey(i));
  return ready;
}

// ---- Feeding plants --------------------------------------------------------------------------------------

/** How often each input is given while it suits the plant's stage. */
export const FEED_EVERY_DAYS = 7;
/** Flowering is expected this far along from seedling (or transplanting) to harvest. */
const FLOWERING_SHARE = 0.45;
/** The changeover is the last stretch before flowering. */
const CHANGEOVER_DAYS = 10;

export interface FeedStageStatus {
  stage: FeedStage;
  /** For crops that flower: when, and whether that's an estimate. */
  flowering: { date: Date; estimated: boolean } | null;
  /** e.g. "Flowering in ~12 days". */
  note: string | null;
}

/** Which KNF stage a plant is at; null for seeds, harvested crops and plants that aren't crops. */
export function feedStage(plant: PlantItem, now: Date = new Date()): FeedStageStatus | null {
  const g = plant.growth;
  if (!g) return null;
  const status = growthStatus(g, now);
  if (status.stage === 'seed' || status.stage === 'harvested') return null;
  if (!findCrop(g.cropId)?.fruits) return { stage: 'vegetative', flowering: null, note: null };
  const flowering = g.floweredAt
    ? { date: new Date(g.floweredAt), estimated: false }
    : { date: addDays(status.harvestFrom, Math.round(g.daysToHarvest * FLOWERING_SHARE)), estimated: true };
  const n = daysBetween(now, flowering.date);
  // Seedlings that haven't been planted out yet are always in leafy growth.
  if (status.stage === 'seedling' && !g.floweredAt) {
    return { stage: 'vegetative', flowering, note: null };
  }
  if (!flowering.estimated || n <= 0) {
    return { stage: 'fruiting', flowering, note: flowering.estimated ? 'Should be flowering by now' : null };
  }
  return {
    stage: n <= CHANGEOVER_DAYS ? 'changeover' : 'vegetative',
    flowering,
    note: `Flowering in ~${formatDays(n)}`,
  };
}

export interface InputDue {
  key: string;
  recipe: Recipe;
  /** When it was last given to this plant. */
  last?: string;
  status: DueStatus;
  /** True when there's a batch of it ready to use. */
  haveReady: boolean;
}

export function lastGiven(plant: PlantItem, key: string): string | undefined {
  return plant.inputs.find((l) => l.given.includes(key))?.date;
}

/** The inputs that suit a plant's stage right now, and whether each is due. */
export function recommendedInputs(plant: PlantItem, ready: Set<string>, now: Date = new Date()): InputDue[] {
  const stage = feedStage(plant, now)?.stage;
  if (!stage) return [];
  return RECIPES.filter((r) => r.stages.includes(stage)).map((recipe) => {
    const last = lastGiven(plant, recipe.id);
    return { key: recipe.id, recipe, last, status: dueSummary(last, FEED_EVERY_DAYS, now).status, haveReady: ready.has(recipe.id) };
  });
}

/** The inputs a plant should be given now – only ones you have a batch of ready, so it never nags about the rest. */
export function inputsDue(plant: PlantItem, ready: Set<string>, now: Date = new Date()): InputDue[] {
  return recommendedInputs(plant, ready, now).filter((i) => i.haveReady && i.status !== 'ok');
}

/** "1 ml LAB + 1 ml WCA per litre of water". */
export function mixText(keys: string[]): string {
  const parts = keys.map((k) => {
    const dilution = findRecipe(k)?.dilution ?? 1000;
    return `${Math.round((1000 / dilution) * 10) / 10} ml ${inputLabel(k)}`;
  });
  return `${parts.join(' + ')} per litre of water`;
}
