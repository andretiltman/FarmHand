import { findCrop } from './crops';
import { addDays, daysBetween, formatDays } from './dates';
import { growthStatus } from './growth';
import { dueSummary, DueStatus } from './stats';
import { InputItem, PlantItem, TrackedItem } from './types';

/**
 * Natural farming inputs: home-made ferments and extracts from Korean Natural Farming (KNF) – like lactic acid
 * bacteria (LAB), indigenous microorganisms (IMO) and water-soluble calcium from eggshells in vinegar (WCA) – and
 * from JADAM, a low-cost offshoot of KNF (JADAM microbial solution and liquid fertilizer).
 *
 * Batches are made step by step (e.g. LAB: rice wash → add milk → harvest the serum) and, once ready, are
 * diluted in water and given to plants. KNF feeds a plant what suits its stage of growth:
 *  - Vegetative growth (seedlings and leafy growth): LAB, FPJ.
 *  - Changeover (the week or two before flowering): WCAP, WCA – calcium to switch from leaves to flowers.
 *  - Flowering & fruiting: WCA, FFJ.
 * LAB, IMO (on the soil) and JADAM's inputs suit every stage. Timings and dilutions are the usual ones; recipes
 * vary between growers.
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

/** Which school of natural farming a recipe comes from. */
export type FarmingSystem = 'KNF' | 'JADAM';

export const SYSTEMS: Record<FarmingSystem, string> = {
  KNF: 'Korean Natural Farming',
  JADAM: 'JADAM',
};

export interface Recipe {
  id: string;
  system: FarmingSystem;
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
  dilution?: number;
  /** How much to use, for inputs that aren't simply diluted (e.g. IMO is scattered on the soil). */
  dose?: string;
  /** The stages of growth it's given at. */
  stages: FeedStage[];
  /** How often it's given while it suits the plant's stage; FEED_EVERY_DAYS when absent. */
  everyDays?: number;
  /** How to use and keep it. */
  use: string;
}

export const RECIPES: Recipe[] = [
  {
    id: 'lab',
    system: 'KNF',
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
    id: 'imo',
    system: 'KNF',
    name: 'Indigenous microorganisms',
    short: 'IMO',
    emoji: '🍚',
    about: 'Fungi and bacteria collected from a nearby forest and multiplied up, to bring your soil to life.',
    steps: [
      {
        title: 'Start',
        done: 'Rice box set out',
        how: 'Fill a small wooden box about ⅓ deep with cooked rice (a little on the hard side). Cover it with paper, tie it down and leave it on the leaf litter in a nearby forest or bamboo grove, sheltered from rain and animals.',
      },
      {
        title: 'Mix with sugar (IMO2)',
        done: 'IMO2 made',
        how: 'After 3–5 days the rice is covered in white mould (throw it out if the mould is black or brightly coloured). Mix it with the same weight of brown sugar, pack it into a jar about ⅔ full and cover with paper.',
      },
      {
        title: 'Mix into bran (IMO3)',
        done: 'IMO3 made',
        how: 'Dilute IMO2 1:1000 in water and mix it into rice or wheat bran until it holds together when squeezed but doesn\'t drip. Pile it about 30 cm high on bare ground under a roof, cover with straw or cloth, and turn it if it gets hotter than about 50 °C.',
      },
      {
        title: 'Mix with soil (IMO4)',
        done: 'IMO4 made',
        how: 'After 5–7 days, when it\'s covered in white mycelium and cooling down, mix it with the same amount of soil from your garden. Moisten it the same way, pile it up and cover it again.',
      },
      {
        title: 'Finish',
        done: 'IMO4 ready',
        how: 'After 5–7 days, once it has cooled and smells sweet and earthy, it\'s ready. Keep it covered and slightly moist in the shade.',
      },
    ],
    waits: [4, 7, 7, 7],
    dose: 'Scatter a thin layer on the soil',
    stages: ['vegetative', 'changeover', 'fruiting'],
    everyDays: 30,
    use: 'Scatter IMO4 thinly over beds a week or so before planting, or around plants, and cover with mulch. Water it in with diluted LAB or FPJ to give the microbes a boost. IMO2 keeps for months and can be used to start another IMO3.',
  },
  {
    id: 'wca',
    system: 'KNF',
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
    system: 'KNF',
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
    system: 'KNF',
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
    system: 'KNF',
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
  {
    id: 'jms',
    system: 'JADAM',
    name: 'JADAM microbial solution',
    short: 'JMS',
    emoji: '🥔',
    about: 'A quick, cheap brew of soil microbes from leaf mould, fed on potato. Brings the soil to life.',
    steps: [
      {
        title: 'Start',
        done: 'Brew started',
        how: 'For about 20 L of rain or dechlorinated water: put 100 g of leaf mould (the crumbly soil under fallen leaves in a forest) and 200 g of boiled potato in a cloth bag. Squeeze and knead the bag in the water until the potato is mashed through, then add a teaspoon of sea salt. Leave it in a warm spot.',
      },
      {
        title: 'Check it’s ready',
        done: 'Ready',
        how: 'After 1–3 days (longer in cold weather) it\'s bubbly with a foamy film on top. That\'s its peak – use it straight away, it doesn\'t keep.',
      },
    ],
    waits: [2],
    dilution: 10,
    stages: ['vegetative', 'changeover', 'fruiting'],
    use: 'Water it onto the soil within a day or so of it peaking – as it is, or diluted up to 1:10. Mix in JLF to feed as well. Make a fresh batch each time.',
  },
  {
    id: 'jlf',
    system: 'JADAM',
    name: 'JADAM liquid fertilizer',
    short: 'JLF',
    emoji: '🪣',
    about: 'Weeds and plant scraps fermented in water into a complete liquid fertilizer, for next to nothing.',
    steps: [
      {
        title: 'Start',
        done: 'Drum filled',
        how: 'Fill a drum or bucket with weeds, grass or plant scraps – ideally from the crop you\'ll feed. Add a handful of leaf mould, top up with water so it\'s all covered and put a lid on loosely.',
      },
      {
        title: 'Check it’s ready',
        done: 'Ready',
        how: 'It smells bad for the first few weeks, then mellows. After about 3 months (sooner in hot weather) it\'s ready to use; it keeps improving for 6 months or more.',
      },
    ],
    waits: [90],
    dilution: 20,
    stages: ['vegetative', 'changeover', 'fruiting'],
    use: 'Strain and dilute about 1:20 with water (weaker for seedlings), and water onto the soil. Mix it with JMS to feed the soil life too. Top the drum up with more plant material as you use it.',
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
      system: 'KNF',
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

/** How much to use: "1 ml per litre (1:1000)", or e.g. "Scatter a thin layer on the soil". */
export function doseText(recipe: Recipe): string {
  return recipe.dose ?? dilutionText(recipe.dilution ?? 1000);
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
    const every = recipe.everyDays ?? FEED_EVERY_DAYS;
    return { key: recipe.id, recipe, last, status: dueSummary(last, every, now).status, haveReady: ready.has(recipe.id) };
  });
}

/** The inputs a plant should be given now – only ones you have a batch of ready, so it never nags about the rest. */
export function inputsDue(plant: PlantItem, ready: Set<string>, now: Date = new Date()): InputDue[] {
  return recommendedInputs(plant, ready, now).filter((i) => i.haveReady && i.status !== 'ok');
}

/** "1 ml LAB + 1 ml WCA per litre of water", plus inputs that aren't diluted, e.g. "IMO on the soil". */
export function mixText(keys: string[]): string {
  const liquid = keys.filter((k) => !findRecipe(k)?.dose);
  const solid = keys.filter((k) => findRecipe(k)?.dose);
  const parts = liquid.map((k) => {
    const dilution = findRecipe(k)?.dilution ?? 1000;
    return `${Math.round((1000 / dilution) * 10) / 10} ml ${inputLabel(k)}`;
  });
  return [
    parts.length ? `${parts.join(' + ')} per litre of water` : '',
    solid.length ? `${solid.map(inputLabel).join(' + ')} on the soil` : '',
  ]
    .filter(Boolean)
    .join(', ');
}
