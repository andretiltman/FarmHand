import { MutableRefObject, ReactNode, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { findCrop } from '../crops';
import { growthStatus } from '../growth';
import { colors, radius } from '../theme';
import { getDeviceId } from '../device';
import { Deleted, MergeResult, SyncSnapshot } from '../sync';
import {
  packPlants,
  packSync,
  PhotoChoice,
  plantCount,
  photosToSend,
  Received,
  RECENT_PHOTO_DAYS,
  splitGrowth,
  syncFileName,
  TransferFile,
  transferFileName,
  TransferPlant,
  unpackReceived,
} from '../transfer';
import { pickTransferFile, shareTransferFile } from '../transferFile';
import { Growth, PlantItem, TrackedItem } from '../types';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { Stepper } from './Stepper';

interface Props {
  visible: boolean;
  onClose: () => void;
  items: TrackedItem[];
  onImport: (plants: TransferPlant[]) => Promise<void>;
  onRemove: (ids: string[]) => void;
  onUpdateGrowth: (id: string, growth: Growth) => void;
  deletedRef: MutableRefObject<Deleted>;
  onSync: (snapshot: SyncSnapshot) => Promise<MergeResult>;
}

type Step =
  | { kind: 'menu' }
  | { kind: 'send' }
  /** `kept` holds what stays here for plants only partly given away. */
  | { kind: 'sent'; ids: string[]; kept: Record<string, Growth> }
  | { kind: 'sync' }
  | { kind: 'receive'; received: Received | null }
  | { kind: 'received'; count: number }
  | { kind: 'synced'; result: MergeResult };

/**
 * Send plants to another phone as a file (via WhatsApp, email, Bluetooth, …), add plants someone sent you,
 * or sync everything with another phone by swapping sync files.
 */
export function TransferModal({
  visible,
  onClose,
  items,
  onImport,
  onRemove,
  onUpdateGrowth,
  deletedRef,
  onSync,
}: Props) {
  const plants = items.filter((i): i is PlantItem => i.kind === 'plant');
  const [step, setStep] = useState<Step>({ kind: 'menu' });
  const [selected, setSelected] = useState<string[]>([]);
  /** How many to give away, for entries holding several plants (all of them when not set). */
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [includePhotos, setIncludePhotos] = useState(true);
  const [syncPhotos, setSyncPhotos] = useState<PhotoChoice>('recent');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setStep({ kind: 'menu' });
      setSelected([]);
      setAmounts({});
      setIncludePhotos(true);
      setSyncPhotos('recent');
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
  const syncPhotoCount = (choice: PhotoChoice) =>
    plants.reduce((n, p) => n + photosToSend(p.photos, choice).length, 0);

  const amountOf = (p: PlantItem) => {
    const total = plantCount(p);
    return total === undefined ? undefined : Math.min(amounts[p.id] ?? total, total);
  };

  const send = () =>
    run(async () => {
      const kept: Record<string, Growth> = {};
      const toSend = chosen.map((p) => {
        const give = amountOf(p);
        if (!p.growth || give === undefined || give >= plantCount(p)!) return p;
        const split = splitGrowth(p.growth, give);
        kept[p.id] = split.kept;
        return { ...p, growth: split.sent };
      });
      const text = await packPlants(toSend, includePhotos);
      await shareTransferFile(transferFileName(toSend), text);
      go({ kind: 'sent', ids: chosen.map((p) => p.id), kept });
    });

  const sendSync = () =>
    run(async () => {
      const text = await packSync(await getDeviceId(), items, deletedRef.current, syncPhotos);
      await shareTransferFile(syncFileName(), text);
      onClose();
    });

  const choose = () =>
    run(async () => {
      const text = await pickTransferFile();
      if (text !== null) go({ kind: 'receive', received: unpackReceived(text) });
    });

  const merge = (snapshot: SyncSnapshot) =>
    run(async () => {
      go({ kind: 'synced', result: await onSync(snapshot) });
    });

  const receive = (file: TransferFile) =>
    run(async () => {
      await onImport(file.plants);
      go({ kind: 'received', count: file.plants.length });
    });

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const allSelected = plants.length > 0 && selected.length === plants.length;

  const photoSwitch =
    photoCount > 0 ? (
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
    ) : null;

  let title = 'Send or receive plants';
  let body: ReactNode;
  let footer: ReactNode = null;

  switch (step.kind) {
    case 'menu':
      body = (
        <>
          <Text style={styles.help}>
            Move plants to someone else's phone – with their whole journey, watering history, tags and photos – or
            sync with a phone you share the garden with.
          </Text>
          <View style={styles.choiceRow}>
            <Choice emoji="📤" title="Send" desc="Share plants as a file" onPress={() => go({ kind: 'send' })} />
            <Choice
              emoji="📥"
              title="Receive"
              desc="Add plants someone sent you"
              onPress={() => go({ kind: 'receive', received: null })}
            />
          </View>
          <Pressable
            onPress={() => go({ kind: 'sync' })}
            style={({ pressed }) => [styles.syncChoice, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Sync with another phone"
          >
            <Text style={styles.syncEmoji}>🔄</Text>
            <View style={styles.flex}>
              <Text style={[styles.choiceTitle, styles.noMargin]}>Sync</Text>
              <Text style={styles.syncDesc}>Keep two phones up to date with each other's changes</Text>
            </View>
          </Pressable>
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
            {plants.map((p) => {
              const checked = selected.includes(p.id);
              const total = plantCount(p);
              return (
                <View key={p.id}>
                  <PlantRow plant={p} checked={checked} onPress={() => toggle(p.id)} />
                  {checked && total !== undefined && total > 1 ? (
                    <View style={styles.amount}>
                      <Text style={styles.amountLabel}>How many to give?</Text>
                      <Stepper
                        label={`${p.name} to give`}
                        value={amountOf(p)!}
                        onChange={(n) => setAmounts((prev) => ({ ...prev, [p.id]: n }))}
                        min={1}
                        max={total}
                        suffix={`of ${total}`}
                      />
                      <Text style={styles.hint}>
                        {amountOf(p) === total ? 'All of them' : `${total - amountOf(p)!} stay with you`}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
            {photoSwitch}
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

    case 'sent': {
      const { ids, kept } = step;
      const whole = ids.filter((id) => !kept[id]);
      const split = ids.filter((id) => kept[id]);
      const one = ids.length === 1;
      body = (
        <>
          <Text style={styles.help}>
            Once the other person has added {one ? 'it' : 'them'} on their phone (📥 Receive),{' '}
            {split.length === 0
              ? `you can remove ${one ? 'the plant' : `the ${ids.length} plants`} from yours to finish moving ${one ? 'it' : 'them'}`
              : 'you can take what you gave away off your phone'}{' '}
            – or keep a copy if you're both looking after {one ? 'it' : 'them'}.
          </Text>
          {split.map((id) => {
            const plant = plants.find((p) => p.id === id);
            return plant ? (
              <Text key={id} style={[styles.hint, styles.spaced]}>
                {plant.name}: {plantCount({ ...plant, growth: kept[id] })} will stay with you.
              </Text>
            ) : null;
          })}
          {whole.length > 0 && split.length > 0 ? (
            <Text style={[styles.hint, styles.spaced]}>
              {whole.length === 1 ? '1 plant was' : `${whole.length} plants were`} given away completely and will be
              removed.
            </Text>
          ) : null}
        </>
      );
      title = 'Sent?';
      footer = (
        <>
          <Button label="Keep a copy" variant="secondary" onPress={onClose} />
          <Button
            label={split.length === 0 ? 'Remove from my phone' : 'Update my phone'}
            variant={split.length === 0 ? 'danger' : 'primary'}
            onPress={() => {
              split.forEach((id) => onUpdateGrowth(id, kept[id]));
              if (whole.length) onRemove(whole);
              onClose();
            }}
          />
        </>
      );
      break;
    }

    case 'sync':
      title = 'Sync with another phone';
      body = (
        <ScrollView style={styles.list}>
          <Text style={styles.help}>
            Sends everything on this phone – plants, animals and tasks. The other phone taps 📥 Receive and your changes
            are merged with theirs: waterings, feedings and eggs from both phones are kept, and for anything else the
            most recent change wins. Then do the same the other way round.
          </Text>
          <Text style={[styles.hint, styles.spaced]}>
            Both on the same Home Assistant? Turn on 🏠 → Sync with other phones and this happens automatically.
          </Text>
          {syncPhotoCount('all') > 0 ? (
            <>
              <Text style={[styles.switchLabel, styles.photosLabel]}>Photos</Text>
              <View style={styles.segments}>
                {(
                  [
                    ['none', 'None'],
                    ['recent', `Last ${RECENT_PHOTO_DAYS} days`],
                    ['all', 'All'],
                  ] as const
                ).map(([choice, label]) => {
                  const on = syncPhotos === choice;
                  return (
                    <Pressable
                      key={choice}
                      onPress={() => setSyncPhotos(choice)}
                      style={({ pressed }) => [styles.segment, on && styles.segmentOn, pressed && styles.pressed]}
                      accessibilityRole="radio"
                      aria-checked={on}
                    >
                      <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{label}</Text>
                      {choice !== 'none' ? (
                        <Text style={[styles.segmentCount, on && styles.segmentTextOn]}>
                          {syncPhotoCount(choice)} photo{syncPhotoCount(choice) === 1 ? '' : 's'}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.hint}>
                Send all photos the first time you sync. After that, the last {RECENT_PHOTO_DAYS} days keeps the file
                small – photos you leave out stay on the other phone.
              </Text>
            </>
          ) : null}
          {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
        </ScrollView>
      );
      footer = (
        <>
          <Button label="Back" variant="secondary" onPress={() => go({ kind: 'menu' })} />
          <Button label={busy ? 'Preparing…' : 'Send sync file'} onPress={sendSync} disabled={busy} />
        </>
      );
      break;

    case 'receive':
      title = 'Receive';
      if (!step.received) {
        body = (
          <>
            <Text style={styles.help}>
              Ask the other person to tap 📤 Send or Sync. When the file arrives (e.g. in WhatsApp or your email), save it to your
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
      } else if (step.received.kind === 'sync') {
        const snapshot = step.received.snapshot;
        title = 'Sync from another phone';
        body = (
          <>
            <Text style={styles.help}>
              This file has {snapshot.items.length} item{snapshot.items.length === 1 ? '' : 's'} from another phone.
              Their changes will be merged with yours – nothing you've logged here is lost.
            </Text>
            {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
          </>
        );
        footer = (
          <>
            <Button label="Cancel" variant="secondary" onPress={() => go({ kind: 'receive', received: null })} />
            <Button label={busy ? 'Syncing…' : 'Sync'} onPress={() => merge(snapshot)} disabled={busy} />
          </>
        );
      } else {
        const file = step.received.file;
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
            <Button label="Cancel" variant="secondary" onPress={() => go({ kind: 'receive', received: null })} />
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

    case 'synced': {
      const { added, updated, removed } = step.result;
      const parts = [
        added ? `${added} new` : '',
        updated ? `${updated} updated` : '',
        removed ? `${removed} removed` : '',
      ].filter(Boolean);
      title = 'Synced';
      body = (
        <Text style={styles.help}>
          ✅ {parts.length ? `${parts.join(', ')}.` : 'You were already up to date.'} To send your changes back, tap 🔄
          Sync and send them a sync file too.
        </Text>
      );
      footer = <Button label="Done" onPress={onClose} />;
      break;
    }
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
  syncChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 12,
    borderWidth: 2,
    borderColor: colors.water,
    backgroundColor: colors.waterSoft,
    borderRadius: radius.md,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  syncEmoji: { fontSize: 34 },
  syncDesc: { fontSize: 13, color: colors.muted, marginTop: 2 },
  spaced: { marginTop: 12 },
  photosLabel: { marginTop: 18, marginBottom: 8 },
  segments: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  segment: {
    flex: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  segmentOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'center' },
  segmentCount: { fontSize: 12, color: colors.muted, marginTop: 2 },
  segmentTextOn: { color: colors.primaryText },
  noMargin: { marginTop: 0 },
  list: { flexGrow: 0 },
  amount: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  amountLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
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
