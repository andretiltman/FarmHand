import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatShortDate, relativeDay } from '../dates';
import {
  batchSteps,
  dilutionText,
  FEED_STAGES,
  feedStage,
  findRecipe,
  inputEmoji,
  inputKey,
  inputLabel,
  mixText,
  OTHER_INPUT,
  RECIPES,
  recommendedInputs,
  Recipe,
} from '../natural';
import { colors, radius } from '../theme';
import { InputItem, PlantItem } from '../types';
import { Button } from './Button';

interface PlantInputsProps {
  plant: PlantItem;
  ready: Set<string>;
  onGive: () => void;
  onSetFlowered: (flowered: boolean) => void;
}

/** A plant's stage of growth, the natural inputs that suit it, and when each was last given. */
export function PlantInputs({ plant, ready, onGive, onSetFlowered }: PlantInputsProps) {
  const stage = feedStage(plant);
  const recommended = recommendedInputs(plant, ready);
  const info = stage && FEED_STAGES[stage.stage];
  const flowered = plant.growth?.floweredAt;

  return (
    <View>
      {info ? (
        <View style={styles.stage}>
          <Text style={styles.stageTitle}>
            {info.emoji} {info.label}
          </Text>
          <Text style={styles.muted}>
            {info.about}
            {stage.note ? ` · ${stage.note}` : ''}
          </Text>
          {flowered ? (
            <Text style={styles.muted}>🌼 Flowering since {formatShortDate(new Date(flowered))}</Text>
          ) : stage.flowering ? (
            <Text style={styles.link} onPress={() => onSetFlowered(true)} accessibilityRole="button">
              🌼 It has started flowering
            </Text>
          ) : null}
        </View>
      ) : (
        <Text style={[styles.muted, styles.spaced]}>
          {plant.growth
            ? 'Seeds and harvested crops don’t need inputs.'
            : 'Give natural inputs whenever it suits – LAB is good for any plant.'}
        </Text>
      )}

      {recommended.map((r) => {
        const due = r.status !== 'ok';
        return (
          <View key={r.key} style={styles.row}>
            <Text style={styles.rowEmoji}>{r.recipe.emoji}</Text>
            <View style={styles.shrink}>
              <Text style={styles.rowTitle}>
                {r.recipe.short} <Text style={styles.rowName}>· {r.recipe.name}</Text>
              </Text>
              <Text style={styles.muted}>{dilutionText(r.recipe.dilution)}</Text>
              {!r.haveReady && <Text style={styles.muted}>No batch ready – start one with ＋ Add → Natural input</Text>}
            </View>
            <Text style={[styles.rowStatus, { color: due && r.haveReady ? colors.warning : due ? colors.muted : colors.plant }]}>
              {r.last ? `Given ${relativeDay(r.last)}` : 'Not given yet'}
            </Text>
          </View>
        );
      })}

      <View style={styles.actionRow}>
        <Button label="🧪  Give natural inputs" color={colors.input} onPress={onGive} />
      </View>
    </View>
  );
}

/** Every input that can be given: the recipes, plus your own inputs from batches and the plant's history. */
export function inputChoices(plant: PlantItem, batches: InputItem[], ready: Set<string>): string[] {
  const recommended = recommendedInputs(plant, ready).map((r) => r.key);
  const own = [
    ...batches.filter((b) => b.recipeId === OTHER_INPUT || !findRecipe(b.recipeId)).map(inputKey),
    ...plant.inputs.flatMap((l) => l.given).filter((k) => !findRecipe(k)),
  ];
  const all = [...RECIPES.map((r) => r.id), ...own];
  return [...new Set([...recommended, ...all])];
}

/** The inputs to tick as given: those due with a batch ready, else whatever's recommended and ready. */
export function inputsToTick(plant: PlantItem, ready: Set<string>): string[] {
  const recommended = recommendedInputs(plant, ready).filter((r) => r.haveReady);
  const due = recommended.filter((r) => r.status !== 'ok');
  return (due.length ? due : recommended).map((r) => r.key);
}

interface PickerProps {
  plant: PlantItem;
  choices: string[];
  ready: Set<string>;
  given: string[];
  onChange: (given: string[]) => void;
}

/** Tick which natural inputs were given, with how much of each goes in a litre of water. */
export function InputPicker({ plant, choices, ready, given, onChange }: PickerProps) {
  const recommended = new Set(recommendedInputs(plant, ready).map((r) => r.key));
  const toggle = (key: string) =>
    onChange(choices.filter((k) => (k === key ? !given.includes(k) : given.includes(k))));

  return (
    <View>
      {choices.map((key) => {
        const on = given.includes(key);
        const recipe = findRecipe(key);
        const notes = [
          recipe ? dilutionText(recipe.dilution) : null,
          recommended.has(key) ? 'Suits this stage' : null,
          ready.has(key) ? 'Batch ready' : null,
        ].filter(Boolean);
        return (
          <Pressable
            key={key}
            onPress={() => toggle(key)}
            style={({ pressed }) => [styles.pickRow, pressed && styles.pressed]}
            accessibilityRole="checkbox"
            aria-checked={on}
            accessibilityLabel={recipe ? `${recipe.short}, ${recipe.name}` : inputLabel(key)}
          >
            <View style={[styles.box, on && styles.boxOn]}>{on && <Text style={styles.tick}>✓</Text>}</View>
            <Text style={styles.rowEmoji}>{inputEmoji(key)}</Text>
            <View style={styles.shrink}>
              <Text style={styles.rowTitle}>
                {inputLabel(key)}
                {recipe ? <Text style={styles.rowName}> · {recipe.name}</Text> : null}
              </Text>
              {notes.length > 0 && <Text style={styles.muted}>{notes.join(' · ')}</Text>}
            </View>
          </Pressable>
        );
      })}
      <Text style={styles.preview}>{given.length ? `🧪 ${mixText(given)}` : 'Tick at least one'}</Text>
    </View>
  );
}

/**
 * A batch's recipe as a checklist: what's been done, and how to do what's next. With `guide`, just the
 * recipe's steps, without dates (before the batch is started).
 */
export function BatchSteps({ batch, recipe, guide }: { batch: InputItem; recipe: Recipe; guide?: boolean }) {
  const steps = batchSteps(batch);
  const nextIndex = guide ? -1 : batch.stepsDone.length;
  return (
    <View>
      {steps.map(({ step, date, done: stepDone }, i) => {
        const done = stepDone && !guide;
        const isNext = i === nextIndex && !batch.usedUpAt;
        return (
          <View key={i} style={[styles.step, isNext && styles.stepNext]}>
            <View style={[styles.stepDot, done && styles.stepDotDone]}>
              <Text style={[styles.stepNumber, done && styles.stepNumberDone]}>{done ? '✓' : i + 1}</Text>
            </View>
            <View style={styles.shrink}>
              <View style={styles.stepHeader}>
                <Text style={[styles.stepTitle, done && styles.stepTitleDone]}>{done ? step.done : step.title}</Text>
                {!guide && <Text style={styles.muted}>{done ? formatShortDate(date) : `~${formatShortDate(date)}`}</Text>}
              </View>
              {!!step.how && !done && <Text style={styles.how}>{step.how}</Text>}
            </View>
          </View>
        );
      })}
      {!!recipe.use && (
        <View style={styles.use}>
          <Text style={styles.useTitle}>How to use</Text>
          <Text style={styles.useText}>💧 {dilutionText(recipe.dilution)}</Text>
          {recipe.stages.length > 0 && (
            <Text style={styles.useText}>
              🌱 {recipe.stages.map((s) => `${FEED_STAGES[s].emoji} ${FEED_STAGES[s].label}`).join(', ')}
            </Text>
          )}
          <Text style={styles.useText}>{recipe.use}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shrink: { flexShrink: 1, flexGrow: 1 },
  pressed: { opacity: 0.7 },
  spaced: { marginBottom: 8 },
  muted: { fontSize: 13, color: colors.muted, marginTop: 2 },
  link: { fontSize: 14, fontWeight: '600', color: colors.input, marginTop: 8 },
  stage: { backgroundColor: colors.inputSoft, borderRadius: radius.sm, padding: 12, marginBottom: 8 },
  stageTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowEmoji: { fontSize: 22 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  rowName: { fontWeight: '400', color: colors.muted },
  rowStatus: { fontSize: 13, fontWeight: '600', textAlign: 'right', maxWidth: 110 },
  actionRow: { flexDirection: 'row', marginTop: 12 },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.input, borderColor: colors.input },
  tick: { color: colors.primaryText, fontSize: 14, fontWeight: '800' },
  preview: { fontSize: 14, fontWeight: '600', color: colors.input, marginTop: 12 },
  step: { flexDirection: 'row', gap: 12, padding: 10, borderRadius: radius.sm },
  stepNext: { backgroundColor: colors.inputSoft },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: { backgroundColor: colors.input },
  stepNumber: { fontSize: 13, fontWeight: '700', color: colors.input },
  stepNumberDone: { color: colors.primaryText },
  stepHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  stepTitle: { fontSize: 15, fontWeight: '700', color: colors.text, flexShrink: 1 },
  stepTitleDone: { color: colors.muted },
  how: { fontSize: 14, color: colors.text, marginTop: 4, lineHeight: 20 },
  use: { marginTop: 12, padding: 12, borderRadius: radius.sm, backgroundColor: colors.background },
  useTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  useText: { fontSize: 14, color: colors.text, marginTop: 4, lineHeight: 20 },
});
