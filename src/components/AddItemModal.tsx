import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius } from '../theme';
import { ItemKind, NewItem } from '../types';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { Stepper } from './Stepper';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (item: NewItem) => void;
}

type Step = 'kind' | 'details' | 'review';
const STEP_NUMBER: Record<Step, number> = { kind: 1, details: 2, review: 3 };

const WATER_PRESETS = [1, 2, 3, 7, 14];
const SPECIES_PRESETS = ['Chicken', 'Duck', 'Quail'];

export function AddItemModal({ visible, onClose, onSave }: Props) {
  const [step, setStep] = useState<Step>('kind');
  const [kind, setKind] = useState<ItemKind | null>(null);
  const [name, setName] = useState('');
  const [waterEveryDays, setWaterEveryDays] = useState(3);
  const [species, setSpecies] = useState('Chicken');
  const [headCount, setHeadCount] = useState(1);

  // Start fresh every time the popup opens.
  useEffect(() => {
    if (visible) {
      setStep('kind');
      setKind(null);
      setName('');
      setWaterEveryDays(3);
      setSpecies('Chicken');
      setHeadCount(1);
    }
  }, [visible]);

  const isPlant = kind === 'plant';
  const accent = isPlant ? colors.plant : colors.animal;
  const trimmedName = name.trim();
  const trimmedSpecies = species.trim() || 'Chicken';

  const chooseKind = (k: ItemKind) => {
    setKind(k);
    setStep('details');
  };

  const save = () => {
    if (!kind || !trimmedName) return;
    onSave(
      kind === 'plant'
        ? { kind, name: trimmedName, waterEveryDays }
        : { kind, name: trimmedName, species: trimmedSpecies, headCount },
    );
    onClose();
  };

  const titles: Record<Step, string> = {
    kind: 'What would you like to track?',
    details: isPlant ? 'Tell us about your plant' : 'Tell us about your animals',
    review: 'Looks good?',
  };

  let footer = null;
  if (step === 'details') {
    footer = (
      <>
        <Button label="Back" variant="secondary" onPress={() => setStep('kind')} />
        <Button label="Next" color={accent} disabled={!trimmedName} onPress={() => setStep('review')} />
      </>
    );
  } else if (step === 'review') {
    footer = (
      <>
        <Button label="Back" variant="secondary" onPress={() => setStep('details')} />
        <Button label={isPlant ? 'Add plant' : 'Add animals'} color={accent} onPress={save} />
      </>
    );
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      subtitle={`Step ${STEP_NUMBER[step]} of 3`}
      title={titles[step]}
      footer={footer}
    >
      <ProgressDots step={STEP_NUMBER[step]} color={kind ? accent : colors.primary} />

      {step === 'kind' && (
        <View style={styles.kindRow}>
          <KindOption
            emoji="🪴"
            title="Plant"
            description="Track how often you water it"
            color={colors.plant}
            soft={colors.plantSoft}
            onPress={() => chooseKind('plant')}
          />
          <KindOption
            emoji="🐔"
            title="Animal"
            description="Track chickens and their eggs"
            color={colors.animal}
            soft={colors.animalSoft}
            onPress={() => chooseKind('animal')}
          />
        </View>
      )}

      {step === 'details' && (
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={isPlant ? 'e.g. Tomato by the window' : 'e.g. The Girls'}
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoFocus
            returnKeyType="next"
            onSubmitEditing={() => trimmedName && setStep('review')}
            maxLength={60}
          />

          {isPlant ? (
            <>
              <Text style={styles.label}>Water every</Text>
              <Stepper
                label="Watering interval"
                value={waterEveryDays}
                onChange={setWaterEveryDays}
                suffix={waterEveryDays === 1 ? 'day' : 'days'}
              />
              <View style={styles.chips}>
                {WATER_PRESETS.map((d) => (
                  <Chip
                    key={d}
                    label={d === 1 ? 'Daily' : d === 7 ? 'Weekly' : d === 14 ? 'Fortnightly' : `${d} days`}
                    selected={waterEveryDays === d}
                    color={colors.plant}
                    onPress={() => setWaterEveryDays(d)}
                  />
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.label}>Type of animal</Text>
              <View style={styles.chips}>
                {SPECIES_PRESETS.map((s) => (
                  <Chip
                    key={s}
                    label={s}
                    selected={species === s}
                    color={colors.animal}
                    onPress={() => setSpecies(s)}
                  />
                ))}
              </View>
              <TextInput
                value={species}
                onChangeText={setSpecies}
                placeholder="Or type another"
                placeholderTextColor={colors.muted}
                style={[styles.input, styles.inputSpaced]}
                maxLength={30}
              />
              <Text style={styles.label}>How many?</Text>
              <Stepper label="Number of animals" value={headCount} onChange={setHeadCount} max={999} />
            </>
          )}
        </ScrollView>
      )}

      {step === 'review' && (
        <View style={[styles.review, { borderColor: accent }]}>
          <Text style={styles.reviewEmoji}>{isPlant ? '🪴' : '🐔'}</Text>
          <Text style={styles.reviewName}>{trimmedName}</Text>
          <Text style={styles.reviewDetail}>
            {isPlant
              ? `Water every ${waterEveryDays} day${waterEveryDays === 1 ? '' : 's'}`
              : `${headCount} × ${trimmedSpecies} · egg tracking`}
          </Text>
        </View>
      )}
    </Sheet>
  );
}

function ProgressDots({ step, color }: { step: number; color: string }) {
  return (
    <View style={styles.dots}>
      {[1, 2, 3].map((n) => (
        <View key={n} style={[styles.dot, { backgroundColor: n <= step ? color : colors.border }]} />
      ))}
    </View>
  );
}

function KindOption(props: {
  emoji: string;
  title: string;
  description: string;
  color: string;
  soft: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.kind,
        { backgroundColor: props.soft, borderColor: props.color },
        pressed && { opacity: 0.7 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${props.title}: ${props.description}`}
    >
      <Text style={styles.kindEmoji}>{props.emoji}</Text>
      <Text style={[styles.kindTitle, { color: props.color }]}>{props.title}</Text>
      <Text style={styles.kindDesc}>{props.description}</Text>
    </Pressable>
  );
}

function Chip(props: { label: string; selected: boolean; color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={props.onPress}
      style={[
        styles.chip,
        props.selected && { backgroundColor: props.color, borderColor: props.color },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: props.selected }}
    >
      <Text style={[styles.chipText, props.selected && { color: colors.primaryText }]}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  dot: { flex: 1, height: 4, borderRadius: 2 },
  kindRow: { flexDirection: 'row', gap: 12, paddingBottom: 8 },
  kind: {
    flex: 1,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  kindEmoji: { fontSize: 44 },
  kindTitle: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  kindDesc: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 4 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  inputSpaced: { marginTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  chipText: { fontSize: 14, color: colors.text, fontWeight: '500' },
  review: {
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: radius.md,
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  reviewEmoji: { fontSize: 48 },
  reviewName: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 8, textAlign: 'center' },
  reviewDetail: { fontSize: 15, color: colors.muted, marginTop: 4, textAlign: 'center' },
});
