import { findCrop } from './crops';
import { growthStatus } from './growth';
import { animalSummary, plantSummary } from './stats';
import { TrackedItem } from './types';

/** Where to reach Home Assistant, and a long-lived access token (Profile → Security in HA). */
export interface HAConfig {
  url: string;
  token: string;
}

/** One entity as sent to HA's REST API (POST /api/states/<entity_id>). */
export interface HASensor {
  entityId: string;
  state: string | number;
  attributes: Record<string, string | number | boolean | null>;
}

/** "http://homeassistant.local:8123/" → "http://homeassistant.local:8123". Adds http:// when no scheme is given. */
export function normalizeUrl(url: string): string {
  let u = url.trim().replace(/\/+$/, '');
  if (u && !/^https?:\/\//i.test(u)) u = `http://${u}`;
  return u;
}

/** "Cherry Tomato #2" → "cherry_tomato_2", the form HA allows in entity ids. */
export function slugify(text: string): string {
  const slug = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || 'item';
}

/** Entity id per item, e.g. sensor.farmhand_tomato. Items sharing a name get the end of their id appended. */
export function entityIds(items: TrackedItem[]): Map<string, string> {
  const counts = new Map<string, number>();
  for (const i of items) counts.set(slugify(i.name), (counts.get(slugify(i.name)) ?? 0) + 1);
  const ids = new Map<string, string>();
  for (const i of items) {
    const slug = slugify(i.name);
    const suffix = counts.get(slug)! > 1 ? `_${slugify(i.id.split('-').pop() ?? i.id)}` : '';
    ids.set(i.id, `sensor.farmhand_${slug}${suffix}`);
  }
  return ids;
}

/** The sensors FarmHand shows in Home Assistant: one per item, plus two totals handy for automations. */
export function buildSensors(items: TrackedItem[], now: Date = new Date()): HASensor[] {
  const ids = entityIds(items);
  const sensors: HASensor[] = [];
  let plantsToWater = 0;
  let eggsToday = 0;

  for (const item of items) {
    const entityId = ids.get(item.id)!;
    if (item.kind === 'plant') {
      const water = plantSummary(item, now);
      if (water.status !== 'ok') plantsToWater++;
      const base = {
        friendly_name: item.name,
        icon: 'mdi:sprout',
        kind: 'plant',
        water_status: water.status,
        water_due: water.dueLabel,
        days_until_water_due: water.daysUntilDue,
        water_every_days: item.waterEveryDays,
        last_watered: item.waterings[0] ?? null,
      };
      if (item.growth) {
        const g = growthStatus(item.growth, now);
        const next = g.steps.find((s) => !s.done);
        sensors.push({
          entityId,
          state: g.stage,
          attributes: {
            ...base,
            crop: findCrop(item.growth.cropId)?.name ?? item.growth.cropId,
            headline: g.headline,
            needs_action: g.needsAction,
            sow_method: item.growth.method,
            sown: item.growth.sownAt,
            next_milestone: next?.label ?? null,
            next_milestone_date: next ? next.date.toISOString() : null,
          },
        });
      } else {
        // Watering-only plants (e.g. houseplants) report their watering status.
        sensors.push({ entityId, state: water.status, attributes: base });
      }
    } else {
      const s = animalSummary(item, now);
      eggsToday += s.today;
      sensors.push({
        entityId,
        state: s.today,
        attributes: {
          friendly_name: item.name,
          icon: 'mdi:egg',
          kind: 'animal',
          unit_of_measurement: 'eggs',
          state_class: 'measurement',
          species: item.species,
          head_count: item.headCount,
          eggs_last_7_days: s.last7Days,
          eggs_total: s.total,
          fed_today: s.fedToday,
          last_fed: item.feedings[0] ?? null,
        },
      });
    }
  }

  sensors.push(
    {
      entityId: 'sensor.farmhand_plants_to_water',
      state: plantsToWater,
      attributes: {
        friendly_name: 'FarmHand plants to water',
        icon: 'mdi:watering-can',
        unit_of_measurement: 'plants',
        state_class: 'measurement',
      },
    },
    {
      entityId: 'sensor.farmhand_eggs_today',
      state: eggsToday,
      attributes: {
        friendly_name: 'FarmHand eggs today',
        icon: 'mdi:egg',
        unit_of_measurement: 'eggs',
        state_class: 'measurement',
      },
    },
  );
  return sensors;
}

async function request(config: HAConfig, method: string, path: string, body?: unknown): Promise<Response> {
  const res = await fetch(`${normalizeUrl(config.url)}${path}`, {
    method,
    headers: { Authorization: `Bearer ${config.token.trim()}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) throw new Error('Home Assistant rejected the access token.');
  return res;
}

/** Checks the URL and token. Throws an Error with a readable message when it doesn't work. */
export async function testConnection(config: HAConfig): Promise<void> {
  let res: Response;
  try {
    res = await request(config, 'GET', '/api/');
  } catch (e) {
    if (e instanceof Error && e.message.includes('access token')) throw e;
    throw new Error(`Couldn't reach Home Assistant at ${normalizeUrl(config.url)}.`);
  }
  if (!res.ok) throw new Error(`Home Assistant answered with error ${res.status}.`);
}

/**
 * Sends every sensor to HA, and removes the ones FarmHand created earlier that no longer exist
 * (e.g. a deleted plant). Returns the entity ids now in HA, to pass as `previous` next time.
 */
export async function pushSensors(config: HAConfig, items: TrackedItem[], previous: string[]): Promise<string[]> {
  const sensors = buildSensors(items);
  for (const s of sensors) {
    const res = await request(config, 'POST', `/api/states/${s.entityId}`, {
      state: s.state,
      attributes: s.attributes,
    });
    if (!res.ok) throw new Error(`Couldn't update ${s.entityId} (error ${res.status}).`);
  }
  const current = sensors.map((s) => s.entityId);
  await removeSensors(config, previous.filter((id) => !current.includes(id)));
  return current;
}

/** Deletes entities from HA. Best effort: a 404 just means HA already forgot it (e.g. after a restart). */
export async function removeSensors(config: HAConfig, entityIds: string[]): Promise<void> {
  for (const id of entityIds) {
    await request(config, 'DELETE', `/api/states/${id}`).catch(() => undefined);
  }
}
