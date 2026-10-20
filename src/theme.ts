export const colors = {
  background: '#F4F6F1',
  surface: '#FFFFFF',
  text: '#1F2A1F',
  muted: '#6B756B',
  border: '#E1E6DD',
  primary: '#3A7D44',
  primaryText: '#FFFFFF',
  plant: '#3A7D44',
  plantSoft: '#E3F1E5',
  animal: '#C77D1A',
  animalSoft: '#FBEFD9',
  task: '#6A5AA8',
  taskSoft: '#ECE9F7',
  water: '#2F7BBF',
  waterSoft: '#E1EEF9',
  input: '#2B7A78',
  inputSoft: '#DDF0EE',
  muck: '#8A5A2B',
  muckSoft: '#F3E8DC',
  warning: '#C7861A',
  danger: '#C0392B',
  dangerSoft: '#FBE4E1',
};

export const radius = { sm: 8, md: 14, lg: 22 };

/** Blends two "#RRGGBB" colours; `t` = 0 gives `a`, 1 gives `b`. */
function mix(a: string, b: string, t: number): string {
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2]
    .map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t).toString(16).padStart(2, '0'))
    .join('')}`;
}

/** Five shades from "nothing" (grey) through a soft colour to its strong one, for heat-map cells. */
export function ramp(soft: string, strong: string): string[] {
  return [colors.border, mix(soft, strong, 0.15), mix(soft, strong, 0.4), mix(soft, strong, 0.7), strong];
}
