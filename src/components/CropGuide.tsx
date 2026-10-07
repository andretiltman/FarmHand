import { StyleSheet, Text, View } from 'react-native';

import { Crop } from '../crops';
import { formatDays } from '../dates';
import { formatSeasons, sowingAdvice } from '../seasons';
import { colors, radius } from '../theme';
import { SowMethod } from '../types';

function formatCm(cm: number): string {
  return cm >= 100 ? `${cm / 100} m` : `${cm} cm`;
}

function formatGermination(crop: Crop): string {
  const range = crop.guide.germinationDays;
  if (!range) return `~${formatDays(crop.daysToSeedling)}`;
  const [min, max] = range;
  const maxText = max % 7 === 0 && max >= 14 ? `${max / 7} weeks` : `${max} days`;
  return `${formatDays(min)} to ${maxText}`;
}

interface Props {
  crop: Crop;
  method: SowMethod;
  /** Show whether now is a good time to sow (when adding a new crop). */
  showAdvice?: boolean;
}

/** Sowing season, depth, spacing and germination for a crop. */
export function CropGuide({ crop, method, showAdvice }: Props) {
  const { guide } = crop;
  const advice = sowingAdvice(guide.sow);
  const daysToHarvest = (method === 'direct' ? crop.daysToSeedling : crop.daysToTransplant) + crop.daysToHarvest;

  const rows: [string, string, string][] = [
    ['📅', 'Sowing season', formatSeasons(guide.sow)],
    ['📏', 'Sowing depth', `${guide.depthMm} mm`],
    ['↔️', 'Spacing', `${formatCm(guide.spacingCm.plant)} apart, rows ${formatCm(guide.spacingCm.row)} apart`],
    ['🌡️', 'Germination', `${guide.germinationC[0]}–${guide.germinationC[1]} °C, ${formatGermination(crop)}`],
    ['🧺', 'Harvest', `${formatDays(daysToHarvest)} after sowing`],
  ];

  return (
    <View>
      {showAdvice && (
        <View style={[styles.advice, advice.inSeason ? styles.adviceGood : styles.adviceWarn]}>
          <Text style={[styles.adviceText, { color: advice.inSeason ? colors.plant : colors.warning }]}>
            {advice.inSeason ? '✅' : '⚠️'} {advice.message}
          </Text>
        </View>
      )}
      <View style={styles.card}>
        {rows.map(([emoji, label, value]) => (
          <View key={label} style={styles.row} accessibilityLabel={`${label}: ${value}`}>
            <Text style={styles.emoji}>{emoji}</Text>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        ))}
        {guide.note && <Text style={styles.note}>❄️ {guide.note}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  advice: { borderRadius: radius.sm, padding: 10, marginBottom: 8 },
  adviceGood: { backgroundColor: colors.plantSoft },
  adviceWarn: { backgroundColor: colors.animalSoft },
  adviceText: { fontSize: 14, fontWeight: '600' },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 5 },
  emoji: { width: 26, fontSize: 15 },
  label: { width: 104, fontSize: 14, color: colors.muted },
  value: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '500' },
  note: {
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.waterSoft,
    borderRadius: radius.sm,
    padding: 8,
    marginTop: 4,
    marginBottom: 6,
  },
});
