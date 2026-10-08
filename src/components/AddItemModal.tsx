import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { CARE, findSpecies, SPECIES_PRESETS, SpeciesPreset, speciesEmoji } from '../care';
import { CROPS, Crop, findCrop } from '../crops';
import { addDays, approxDays, formatShortDate, plural } from '../dates';
import { growthStatus } from '../growth';
import { sowingAdvice } from '../seasons';
import { colors, radius } from '../theme';
import { CareKind, Growth, ItemKind, NewItem, SowMethod } from '../types';
import { Button } from './Button';
import { CarePicker } from './CarePicker';
import { CropGuide } from './CropGuide';
import { Journey } from './Journey';
import { Sheet } from './Sheet';
import { Stepper } from './Stepper';
import { TagPicker } from './TagPicker';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (item: NewItem) => void;
}

type Step = 'kind' | 'crop' | 'details' | 'review';
const PLANT_STEPS: Step[] = ['kind', 'crop', 'details', 'review'];
const SHORT_STEPS: Step[] = ['kind', 'details', 'review'];

/** Crop id for plants tracked for watering only. */
const OTHER = 'other';

const WATER_PRESETS = [1, 2, 3, 7, 14];
/** Common maintenance jobs and how often they're usually done. */
const TASK_PRESETS: { name: string; everyDays: number }[] = [
  { name: 'Septic tank bio enzymes', everyDays: 30 },
  { name: 'Clean chicken coop', everyDays: 7 },
  { name: 'Clean gutters', everyDays: 180 },
  { name: 'Clean water tank', everyDays: 365 },
  { name: 'Service lawnmower', everyDays: 180 },
];
const TASK_INTERVALS: { days: number; label: string }[] = [
  { days: 7, label: 'Weekly' },
  { days: 14, label: 'Fortnightly' },
  { days: 30, label: 'Monthly' },
  { days: 90, label: 'Every 3 months' },
  { days: 180, label: 'Every 6 months' },
  { days: 365, label: 'Yearly' },
];

export function AddItemModal({ visible, onClose, onSave }: Props) {
  const [step, setStep] = useState<Step>('kind');
  const [kind, setKind] = useState<ItemKind | null>(null);
  const [name, setName] = useState('');
  const [waterEveryDays, setWaterEveryDays] = useState(3);
  const [cropId, setCropId] = useState<string | null>(null);
  const [method, setMethod] = useState<SowMethod>('direct');
  const [sownDaysAgo, setSownDaysAgo] = useState(0);
  const [seedsSown, setSeedsSown] = useState(1);
  const [tags, setTags] = useState<string[]>([]);
  const [species, setSpecies] = useState('Chicken');
  const [headCount, setHeadCount] = useState(1);
  const [care, setCare] = useState<CareKind[]>(SPECIES_PRESETS[0].care);
  const [careEvery, setCareEvery] = useState<Partial<Record<CareKind, number>>>({});
  const [tracksEggs, setTracksEggs] = useState(true);
  const [everyDays, setEveryDays] = useState(30);
  /** Days since the task was last done; null when it hasn't been done yet. */
  const [lastDoneDaysAgo, setLastDoneDaysAgo] = useState<number | null>(null);

  // Start fresh every time the popup opens.
  useEffect(() => {
    if (visible) {
      setStep('kind');
      setKind(null);
      setName('');
      setWaterEveryDays(3);
      setCropId(null);
      setMethod('direct');
      setSownDaysAgo(0);
      setSeedsSown(1);
      setTags([]);
      setSpecies('Chicken');
      setHeadCount(1);
      chooseSpecies(SPECIES_PRESETS[0]);
      setEveryDays(30);
      setLastDoneDaysAgo(null);
    }
  }, [visible]);

  const isPlant = kind === 'plant';
  const isTask = kind === 'task';
  const accent = isPlant ? colors.plant : isTask ? colors.task : colors.animal;
  const crop = findCrop(cropId ?? undefined);
  const trimmedName = name.trim();
  const trimmedSpecies = species.trim() || 'Chicken';

  const sequence = kind && kind !== 'plant' ? SHORT_STEPS : PLANT_STEPS;
  const stepIndex = sequence.indexOf(step);
  const go = (delta: 1 | -1) => setStep(sequence[stepIndex + delta]);

  const growth: Growth | undefined = crop && {
    cropId: crop.id,
    method,
    daysToSeedling: crop.daysToSeedling,
    daysToSeedlingMax: crop.guide.germinationDays?.[1],
    daysToTransplant: crop.daysToTransplant,
    daysToHarvest: crop.daysToHarvest,
    sownAt: addDays(new Date(), -sownDaysAgo).toISOString(),
    seedsSown,
  };

  const chooseKind = (k: ItemKind) => {
    setKind(k);
    setStep(k === 'plant' ? 'crop' : 'details');
  };

  const chooseCrop = (c: Crop | null) => {
    // Keep a name the user typed, but swap in the new crop's name if it was ours.
    if (!trimmedName || trimmedName === crop?.name) setName(c?.name ?? '');
    setCropId(c?.id ?? OTHER);
    if (c) {
      setMethod(c.recommended);
      setWaterEveryDays(c.waterEveryDays);
    }
    setStep('details');
  };

  /** Picks a type of animal, with the jobs it usually needs. */
  function chooseSpecies(p: SpeciesPreset) {
    setSpecies(p.name);
    setCare(p.care);
    setCareEvery(p.careEvery);
    setTracksEggs(p.tracksEggs);
  }

  const lastDoneAt = lastDoneDaysAgo === null ? null : addDays(new Date(), -lastDoneDaysAgo);
  const nextDue = lastDoneAt ? addDays(lastDoneAt, everyDays) : new Date();

  const save = () => {
    if (!kind || !trimmedName) return;
    onSave(
      kind === 'plant'
        ? { kind, name: trimmedName, waterEveryDays, growth, tags }
        : kind === 'animal'
          ? { kind, name: trimmedName, species: trimmedSpecies, headCount, care, careEvery, tracksEggs }
          : { kind, name: trimmedName, everyDays, done: lastDoneAt ? [lastDoneAt.toISOString()] : [] },
    );
    onClose();
  };

  const chooseTaskPreset = (p: { name: string; everyDays: number }) => {
    setName(p.name);
    setEveryDays(p.everyDays);
  };

  const titles: Record<Step, string> = {
    kind: 'What would you like to track?',
    crop: 'What are you planting?',
    details: crop
      ? `Planting ${crop.name.toLowerCase()}`
      : isPlant
        ? 'Tell us about your plant'
        : isTask
          ? 'Set up a maintenance task'
          : 'Tell us about your animals',
    review: 'Looks good?',
  };

  let footer = null;
  if (step === 'crop') {
    footer = <Button label="Back" variant="secondary" onPress={() => go(-1)} />;
  } else if (step === 'details') {
    footer = (
      <>
        <Button label="Back" variant="secondary" onPress={() => go(-1)} />
        <Button label="Next" color={accent} disabled={!trimmedName} onPress={() => go(1)} />
      </>
    );
  } else if (step === 'review') {
    footer = (
      <>
        <Button label="Back" variant="secondary" onPress={() => go(-1)} />
        <Button label={isPlant ? 'Add plant' : isTask ? 'Add task' : 'Add animals'} color={accent} onPress={save} />
      </>
    );
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      subtitle={kind ? `Step ${stepIndex + 1} of ${sequence.length}` : 'Step 1'}
      title={titles[step]}
      footer={footer}
    >
      <ProgressDots count={kind ? sequence.length : 3} step={stepIndex + 1} color={kind ? accent : colors.primary} />

      {step === 'kind' && (
        <View style={styles.kindRow}>
          <KindOption
            emoji="🪴"
            title="Plant"
            description="Track watering and its journey from seed to harvest"
            color={colors.plant}
            soft={colors.plantSoft}
            onPress={() => chooseKind('plant')}
          />
          <KindOption
            emoji="🐔"
            title="Animal"
            description="Chickens, dogs, horses – feeding, walks, grooming, rides and eggs"
            color={colors.animal}
            soft={colors.animalSoft}
            onPress={() => chooseKind('animal')}
          />
        </View>
      )}
      {step === 'kind' && (
        <View style={styles.kindRow}>
          <KindOption
            emoji="🛠️"
            title="Maintenance"
            description="Recurring jobs, like adding bio enzymes to the septic tank"
            color={colors.task}
            soft={colors.taskSoft}
            onPress={() => chooseKind('task')}
          />
        </View>
      )}

      {step === 'crop' && (
        <ScrollView style={styles.shrink}>
          <View style={styles.cropGrid}>
            {CROPS.map((c) => (
              <CropTile
                key={c.id}
                emoji={c.emoji}
                label={c.name}
                inSeason={sowingAdvice(c.guide.sow).inSeason}
                selected={cropId === c.id}
                onPress={() => chooseCrop(c)}
              />
            ))}
          </View>
          <Pressable
            onPress={() => chooseCrop(null)}
            style={({ pressed }) => [
              styles.otherTile,
              cropId === OTHER && styles.tileSelected,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Other plant, watering only"
          >
            <Text style={styles.otherEmoji}>🪴</Text>
            <View style={styles.shrink}>
              <Text style={styles.otherTitle}>Other plant / houseplant</Text>
              <Text style={styles.otherDesc}>Just track watering</Text>
            </View>
          </Pressable>
        </ScrollView>
      )}

      {step === 'details' && (
        <ScrollView style={styles.shrink} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, styles.firstLabel]}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={
              isPlant
                ? 'e.g. Fern by the window'
                : isTask
                  ? 'e.g. Septic tank bio enzymes'
                  : `e.g. ${findSpecies(species)?.example ?? 'The Girls'}`
            }
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoFocus={!crop && !isTask}
            returnKeyType="next"
            onSubmitEditing={() => trimmedName && go(1)}
            maxLength={60}
          />

          {crop && (
            <>
              <Text style={styles.label}>Growing guide</Text>
              <CropGuide crop={crop} method={method} showAdvice />

              <Text style={styles.label}>How will you start it?</Text>
              <MethodOption
                title="Sow directly in the ground"
                description={`Seedling in ${approxDays(crop.daysToSeedling)}, harvest ${approxDays(crop.daysToHarvest)} after that`}
                recommended={crop.recommended === 'direct'}
                selected={method === 'direct'}
                onPress={() => setMethod('direct')}
              />
              <MethodOption
                title="Start in a seed tray, transplant later"
                description={`Ready to transplant in ${approxDays(crop.daysToTransplant)}, harvest ${approxDays(crop.daysToHarvest)} after transplanting`}
                recommended={crop.recommended === 'transplant'}
                selected={method === 'transplant'}
                onPress={() => setMethod('transplant')}
              />
              <Text style={styles.tip}>💡 {crop.tip}</Text>

              <Text style={styles.label}>When did you sow it?</Text>
              <View style={styles.chips}>
                <Chip
                  label="Today"
                  selected={sownDaysAgo === 0}
                  color={colors.plant}
                  onPress={() => setSownDaysAgo(0)}
                />
                <Chip
                  label="Yesterday"
                  selected={sownDaysAgo === 1}
                  color={colors.plant}
                  onPress={() => setSownDaysAgo(1)}
                />
              </View>
              <View style={styles.spaced}>
                <Stepper
                  label="Days since sowing"
                  value={sownDaysAgo}
                  onChange={setSownDaysAgo}
                  min={0}
                  max={365}
                  suffix="days ago"
                />
              </View>

              <Text style={styles.label}>How many seeds did you sow?</Text>
              <Stepper
                label="Seeds sown"
                value={seedsSown}
                onChange={setSeedsSown}
                max={999}
                suffix={seedsSown === 1 ? 'seed' : 'seeds'}
              />
            </>
          )}

          {isTask && (
            <>
              <View style={styles.chips}>
                {TASK_PRESETS.map((p) => (
                  <Chip
                    key={p.name}
                    label={p.name}
                    selected={trimmedName === p.name}
                    color={colors.task}
                    onPress={() => chooseTaskPreset(p)}
                  />
                ))}
              </View>

              <Text style={styles.label}>Repeat every</Text>
              <Stepper
                label="Repeat interval"
                value={everyDays}
                onChange={setEveryDays}
                suffix={everyDays === 1 ? 'day' : 'days'}
              />
              <View style={styles.chips}>
                {TASK_INTERVALS.map((t) => (
                  <Chip
                    key={t.days}
                    label={t.label}
                    selected={everyDays === t.days}
                    color={colors.task}
                    onPress={() => setEveryDays(t.days)}
                  />
                ))}
              </View>

              <Text style={styles.label}>When was it last done?</Text>
              <View style={styles.chips}>
                <Chip
                  label="Not done yet"
                  selected={lastDoneDaysAgo === null}
                  color={colors.task}
                  onPress={() => setLastDoneDaysAgo(null)}
                />
                <Chip
                  label="Today"
                  selected={lastDoneDaysAgo === 0}
                  color={colors.task}
                  onPress={() => setLastDoneDaysAgo(0)}
                />
                <Chip
                  label="Earlier"
                  selected={!!lastDoneDaysAgo}
                  color={colors.task}
                  onPress={() => setLastDoneDaysAgo(lastDoneDaysAgo || 7)}
                />
              </View>
              {!!lastDoneDaysAgo && (
                <View style={styles.spaced}>
                  <Stepper
                    label="Days since last done"
                    value={lastDoneDaysAgo}
                    onChange={setLastDoneDaysAgo}
                    max={730}
                    suffix="days ago"
                  />
                </View>
              )}
            </>
          )}

          {isTask ? null : isPlant ? (
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

              <Text style={styles.label}>Tags (optional)</Text>
              <TagPicker tags={tags} onChange={setTags} />
            </>
          ) : (
            <>
              <Text style={styles.label}>Type of animal</Text>
              <View style={styles.chips}>
                {SPECIES_PRESETS.map((p) => (
                  <Chip
                    key={p.name}
                    label={`${p.emoji} ${p.name}`}
                    selected={species === p.name}
                    color={colors.animal}
                    onPress={() => chooseSpecies(p)}
                  />
                ))}
              </View>
              <TextInput
                value={species}
                onChangeText={setSpecies}
                placeholder="Or type another"
                placeholderTextColor={colors.muted}
                style={[styles.input, styles.spaced]}
                maxLength={30}
              />
              <Text style={styles.label}>How many?</Text>
              <Stepper label="Number of animals" value={headCount} onChange={setHeadCount} max={999} />
              <Text style={styles.label}>What do they need?</Text>
              <CarePicker
                care={care}
                careEvery={careEvery}
                tracksEggs={tracksEggs}
                onChange={(c, eggs) => {
                  setCare(c);
                  setTracksEggs(eggs);
                }}
                onChangeEvery={(k, d) => setCareEvery((prev) => ({ ...prev, [k]: d }))}
              />
            </>
          )}
        </ScrollView>
      )}

      {step === 'review' && (
        <ScrollView style={styles.shrink}>
          <View style={[styles.review, { borderColor: accent }]}>
            <Text style={styles.reviewEmoji}>
              {isPlant ? (crop?.emoji ?? '🪴') : isTask ? '🛠️' : speciesEmoji(trimmedSpecies)}
            </Text>
            <Text style={styles.reviewName}>{trimmedName}</Text>
            <Text style={styles.reviewDetail}>
              {isPlant
                ? [
                    growth && (growth.method === 'direct' ? 'Sown directly' : 'Started in a seed tray'),
                    growth && plural(seedsSown, 'seed'),
                    `water every ${plural(waterEveryDays, 'day')}`,
                    ...tags,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : isTask
                  ? [
                      `every ${plural(everyDays, 'day')}`,
                      lastDoneAt ? `last done ${formatShortDate(lastDoneAt)}` : 'not done yet',
                    ].join(' · ')
                  : [
                      `${headCount} × ${trimmedSpecies}`,
                      ...care.map(
                        (k) => `${CARE[k].verb.toLowerCase()} every ${plural(careEvery[k] ?? CARE[k].everyDays, 'day')}`,
                      ),
                      tracksEggs && 'egg tracking',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
            </Text>
            {isTask && (
              <Text style={[styles.reviewHeadline, { color: colors.task }]}>
                {lastDoneAt && nextDue > new Date() ? `Next due ${formatShortDate(nextDue)}` : 'Due now'}
              </Text>
            )}
            {growth && (
              <>
                <View style={styles.reviewJourney}>
                  <Journey steps={growthStatus(growth).steps} />
                </View>
                <Text style={styles.reviewHeadline}>{growthStatus(growth).headline}</Text>
                <Text style={styles.reviewNote}>Dates are estimates – you can confirm each stage as it happens.</Text>
              </>
            )}
          </View>
        </ScrollView>
      )}
    </Sheet>
  );
}

function ProgressDots({ count, step, color }: { count: number; step: number; color: string }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
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
        pressed && styles.pressed,
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

function CropTile(props: { emoji: string; label: string; inSeason: boolean; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [styles.cropTile, props.selected && styles.tileSelected, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${props.label}, ${props.inSeason ? 'in season' : 'off season'}`}
    >
      <Text style={styles.cropEmoji}>{props.emoji}</Text>
      <Text style={styles.cropLabel} numberOfLines={1}>
        {props.label}
      </Text>
      <Text style={[styles.cropSeason, props.inSeason && styles.cropInSeason]}>
        {props.inSeason ? '✓ In season' : 'Off season'}
      </Text>
    </Pressable>
  );
}

function MethodOption(props: {
  title: string;
  description: string;
  recommended: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [styles.method, props.selected && styles.tileSelected, pressed && styles.pressed]}
      accessibilityRole="radio"
      aria-checked={props.selected}
      accessibilityLabel={`${props.title}${props.recommended ? ', recommended' : ''}. ${props.description}`}
    >
      <View style={[styles.radio, props.selected && styles.radioOn]} />
      <View style={styles.shrink}>
        <View style={styles.methodTitleRow}>
          <Text style={styles.methodTitle}>{props.title}</Text>
          {props.recommended && <Text style={styles.badge}>Recommended</Text>}
        </View>
        <Text style={styles.methodDesc}>{props.description}</Text>
      </View>
    </Pressable>
  );
}

function Chip(props: { label: string; selected: boolean; color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={props.onPress}
      style={[styles.chip, props.selected && { backgroundColor: props.color, borderColor: props.color }]}
      accessibilityRole="button"
      aria-selected={props.selected}
    >
      <Text style={[styles.chipText, props.selected && { color: colors.primaryText }]}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shrink: { flexShrink: 1 },
  pressed: { opacity: 0.7 },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  dot: { flex: 1, height: 4, borderRadius: 2 },
  kindRow: { flexDirection: 'row', gap: 12, paddingBottom: 12 },
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
  cropGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  cropTile: {
    width: '31.5%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  tileSelected: { borderColor: colors.plant, borderWidth: 2, backgroundColor: colors.plantSoft },
  cropEmoji: { fontSize: 28 },
  cropLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 4 },
  cropSeason: { fontSize: 11, color: colors.muted, marginTop: 2 },
  cropInSeason: { color: colors.plant, fontWeight: '600' },
  otherTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
  },
  otherEmoji: { fontSize: 28 },
  otherTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  otherDesc: { fontSize: 13, color: colors.muted },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8, marginTop: 18 },
  firstLabel: { marginTop: 0 },
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
  spaced: { marginTop: 10 },
  method: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
  },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, marginTop: 1 },
  radioOn: { borderColor: colors.plant, borderWidth: 6 },
  methodTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  methodTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryText,
    backgroundColor: colors.plant,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  methodDesc: { fontSize: 13, color: colors.muted, marginTop: 2 },
  tip: { fontSize: 13, color: colors.text, backgroundColor: colors.plantSoft, borderRadius: radius.sm, padding: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
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
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  reviewEmoji: { fontSize: 48 },
  reviewName: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 8, textAlign: 'center' },
  reviewDetail: { fontSize: 15, color: colors.muted, marginTop: 4, textAlign: 'center' },
  reviewJourney: { alignSelf: 'stretch', marginTop: 20 },
  reviewHeadline: { fontSize: 16, fontWeight: '700', color: colors.plant, marginTop: 16, textAlign: 'center' },
  reviewNote: { fontSize: 12, color: colors.muted, marginTop: 6, textAlign: 'center' },
});
