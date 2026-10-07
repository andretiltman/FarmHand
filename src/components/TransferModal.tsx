import { ReactNode, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { findCrop } from '../crops';
import { growthStatus } from '../growth';
import { colors, radius } from '../theme';
import { packPlants, TransferFile, transferFileName, TransferPlant, unpackPlants } from '../transfer';
import { pickTransferFile, shareTransferFile } from '../transferFile';
import { PlantItem, TrackedItem } from '../types';
import { Button } from './Button';
import { Sheet } from './Sheet';

interface Props {
  visible: boolean;
  onClose: () => void;
  items: TrackedItem[];
  onImport: (plants: TransferPlant[]) => Promise<void>;
  onRemove: (ids: string[]) => void;
}

type Step =
  | { kind: 'menu' }
  | { kind: 'send' }
  | { kind: 'sent'; ids: string[] }
  | { kind: 'receive'; file: TransferFile | null }
  | { kind: 'received'; count: number };

/** Send plants to another phone as a file (via WhatsApp, email, Bluetooth, …), or add plants someone sent you. */
export function TransferModal({ visible, onClose, items, onImport, onRemove }: Props) {
  const plants = items.filter((i): i is PlantItem => i.kind === 'plant');
  const [step, setStep] = useState<Step>({ kind: 'menu' });
  const [selected, setSelected] = useState<string[]>([]);
  const [includePhotos, setIncludePhotos] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setStep({ kind: 'menu' });
      setSelected([]);
      setIncludePhotos(true);
      setError(null);
    }
  }, [visible]);

  const go = (next: Step) => {
    setError(null);
    setStep(next);
  };

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const chosen = plants.filter((p) => selected.includes(p.id));
  const photoCount = chosen.reduce((n, p) => n + p.photos.length, 0);

  const send = () =>
    run(async () => {
      const text = await packPlants(chosen, includePhotos);
      await shareTransferFile(transferFileName(chosen), text);
      go({ kind: 'sent', ids: chosen.map((p) => p.id) });
    });

  const choose = () =>
    run(async () => {
      const text = await pickTransferFile();
      if (text !== null) go({ kind: 'receive', file: unpackPlants(text) });
    });

  const receive = (file: TransferFile) =>
    run(async () => {
      await onImport(file.plants);
      go({ kind: 'received', count: file.plants.length });
    });

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const allSelected = plants.length > 0 && selected.length === plants.length;

  let title = 'Send or receive plants';
  let body: ReactNode;
  let footer: ReactNode = null;

  switch (step.kind) {
    case 'menu':
      body = (
        <>
          <Text style={styles.help}>
            Move plants to someone else's phone – with their whole journey, watering history, tags and photos.
          </Text>
          <View style={styles.choiceRow}>
            <Choice emoji="📤" title="Send" desc="Share plants as a file" onPress={() => go({ kind: 'send' })} />
            <Choice
              emoji="📥"
              title="Receive"
              desc="Add plants someone sent you"
              onPress={() => go({ kind: 'receive', file: null })}
            />
          </View>
        </>
      );
      break;

    case 'send':
      title = 'Send plants';
      body =
        plants.length === 0 ? (
          <Text style={styles.help}>You don't have any plants to send yet.</Text>
        ) : (
          <ScrollView style={styles.list}>
            <Pressable
              onPress={() => setSelected(allSelected ? [] : plants.map((p) => p.id))}
              style={({ pressed }) => [styles.selectAll, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={styles.selectAllText}>{allSelected ? 'Select none' : 'Select all'}</Text>
            </Pressable>
            {plants.map((p) => (
              <PlantRow key={p.id} plant={p} checked={selected.includes(p.id)} onPress={() => toggle(p.id)} />
            ))}
            {photoCount > 0 ? (
              <View style={styles.switchRow}>
                <View style={styles.flex}>
                  <Text style={styles.switchLabel}>Include photos ({photoCount})</Text>
                  <Text style={styles.hint}>Photos make the file much bigger.</Text>
                </View>
                <Switch
                  value={includePhotos}
                  onValueChange={setIncludePhotos}
                  trackColor={{ true: colors.plant, false: colors.border }}
                />
              </View>
            ) : null}
            {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
          </ScrollView>
        );
      footer = (
        <>
          <Button label="Back" variant="secondary" onPress={() => go({ kind: 'menu' })} />
          <Button
            label={busy ? 'Preparing…' : chosen.length > 1 ? `Send ${chosen.length} plants` : 'Send'}
            onPress={send}
            disabled={busy || chosen.length === 0}
          />
        </>
      );
      break;

    case 'sent':
      title = 'Sent?';
      body = (
        <>
          <Text style={styles.help}>
            Once the other person has added {step.ids.length === 1 ? 'it' : 'them'} on their phone (📥 Receive), you can
            remove {step.ids.length === 1 ? 'the plant' : `the ${step.ids.length} plants`} from yours to finish moving{' '}
            {step.ids.length === 1 ? 'it' : 'them'} – or keep a copy if you're both looking after{' '}
            {step.ids.length === 1 ? 'it' : 'them'}.
          </Text>
        </>
      );
      footer = (
        <>
          <Button label="Keep a copy" variant="secondary" onPress={onClose} />
          <Button
            label="Remove from my phone"
            variant="danger"
            onPress={() => {
              onRemove(step.ids);
              onClose();
            }}
          />
        </>
      );
      break;

    case 'receive':
      title = 'Receive plants';
      if (!step.file) {
        body = (
          <>
            <Text style={styles.help}>
              Ask the other person to tap 📤 Send. When the file arrives (e.g. in WhatsApp or your email), save it to your
              phone, then choose it here.
            </Text>
            {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
          </>
        );
        footer = (
          <>
            <Button label="Back" variant="secondary" onPress={() => go({ kind: 'menu' })} />
            <Button label={busy ? 'Opening…' : 'Choose file'} onPress={choose} disabled={busy} />
          </>
        );
      } else {
        const file = step.file;
        body = (
          <ScrollView style={styles.list}>
            <Text style={styles.help}>
              {file.plants.length === 1 ? 'This plant' : `These ${file.plants.length} plants`} will be added to your
              list:
            </Text>
            {file.plants.map((p, i) => (
              <PlantRow key={`${p.id}-${i}`} plant={p} />
            ))}
            {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
          </ScrollView>
        );
        footer = (
          <>
            <Button label="Cancel" variant="secondary" onPress={() => go({ kind: 'receive', file: null })} />
            <Button
              label={busy ? 'Adding…' : file.plants.length > 1 ? `Add ${file.plants.length} plants` : 'Add plant'}
              onPress={() => receive(file)}
              disabled={busy}
            />
          </>
        );
      }
      break;

    case 'received':
      title = 'Plants added';
      body = (
        <Text style={styles.help}>
          ✅ {step.count === 1 ? '1 plant was' : `${step.count} plants were`} added to your list. Let the sender know so
          they can remove {step.count === 1 ? 'it' : 'them'} from their phone.
        </Text>
      );
      footer = <Button label="Done" onPress={onClose} />;
      break;
  }

  return (
    <Sheet visible={visible} onClose={onClose} subtitle="Transfer" title={title} footer={footer}>
      {body}
    </Sheet>
  );
}

function Choice({ emoji, title, desc, onPress }: { emoji: string; title: string; desc: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${desc}`}
    >
      <Text style={styles.choiceEmoji}>{emoji}</Text>
      <Text style={styles.choiceTitle}>{title}</Text>
      <Text style={styles.choiceDesc}>{desc}</Text>
    </Pressable>
  );
}

function PlantRow({ plant, checked, onPress }: { plant: PlantItem; checked?: boolean; onPress?: () => void }) {
  const crop = plant.growth && findCrop(plant.growth.cropId);
  let detail = plant.growth ? growthStatus(plant.growth).headline : `Water every ${plant.waterEveryDays} days`;
  if (plant.photos.length > 0) detail += ` · ${plant.photos.length} photo${plant.photos.length === 1 ? '' : 's'}`;
  const content = (
    <>
      <Text style={styles.rowEmoji}>{crop?.emoji ?? '🪴'}</Text>
      <View style={styles.flex}>
        <Text style={styles.rowName} numberOfLines={1}>
          {plant.name}
        </Text>
        <Text style={styles.rowDetail} numberOfLines={1}>
          {detail}
        </Text>
      </View>
      {onPress ? (
        <View style={[styles.check, checked && styles.checkOn]}>
          {checked ? <Text style={styles.checkMark}>✓</Text> : null}
        </View>
      ) : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, checked && styles.rowOn, pressed && styles.pressed]}
      accessibilityRole="checkbox"
      aria-checked={checked}
      accessibilityLabel={plant.name}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  help: { fontSize: 15, color: colors.text, lineHeight: 21 },
  hint: { fontSize: 13, color: colors.muted, marginTop: 2 },
  error: { fontSize: 14, color: colors.danger, marginTop: 12 },
  choiceRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  choice: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.plant,
    backgroundColor: colors.plantSoft,
    borderRadius: radius.md,
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  choiceEmoji: { fontSize: 40 },
  choiceTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 8 },
  choiceDesc: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 4 },
  list: { flexGrow: 0 },
  selectAll: { alignSelf: 'flex-end', paddingVertical: 4, marginBottom: 8 },
  selectAllText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  rowOn: { borderColor: colors.plant, backgroundColor: colors.plantSoft },
  rowEmoji: { fontSize: 26 },
  rowName: { fontSize: 16, fontWeight: '600', color: colors.text },
  rowDetail: { fontSize: 13, color: colors.muted, marginTop: 2 },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.plant, borderColor: colors.plant },
  checkMark: { color: colors.primaryText, fontSize: 15, fontWeight: '800' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
  switchLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
});
