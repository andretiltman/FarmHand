/** Tags offered for every plant. Users can add their own too. */
export const PLANT_TAGS = ['GMO-free', 'Bush', 'Runner'];

/** Tags that can't apply together – a plant is either a bush or a runner variety. */
const EXCLUSIVE = [['Bush', 'Runner']];

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function hasTag(tags: string[], tag: string): boolean {
  return tags.some((t) => same(t, tag));
}

/** Adds or removes a tag, dropping any tag it can't be combined with. */
export function toggleTag(tags: string[], tag: string): string[] {
  const clean = tag.trim();
  if (!clean) return tags;
  if (hasTag(tags, clean)) return tags.filter((t) => !same(t, clean));
  const clashes = EXCLUSIVE.find((group) => group.some((g) => same(g, clean)))?.filter((g) => !same(g, clean)) ?? [];
  return [...tags.filter((t) => !clashes.some((c) => same(c, t))), clean];
}
