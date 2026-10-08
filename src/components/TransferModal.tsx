import { MutableRefObject, ReactNode, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { joinNames, speciesEmoji } from '../care';
import { findCrop } from '../crops';
import { plural } from '../dates';
import { growthStatus } from '../growth';
import { colors, radius } from '../theme';
import { getDeviceId } from '../device';
import { Deleted, MergeResult, SyncSnapshot } from '../sync';
import {
  packItems,
  packSync,
  PhotoChoice,
  plantCount,
  photosToSend,
  Received,
  RECENT_PHOTO_DAYS,
  splitGrowth,
  syncFileName,
  KeptAnimals,
  splitAnimal,
  TransferFile,
  transferFileName,
  TransferPick,
  TransferPlant,
  unpackReceived,
} from '../transfer';
import { pickTransferFile, shareTransferFile } from '../transferFile';
import { AnimalItem, Growth, PlantItem, SeedPacket, TaskItem, TrackedItem } from '../types';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { Stepper } from './Stepper';

interface Props {
  visible: boolean;
  onClose: () => void;
  items: TrackedItem[];
  onImport: (plants: TransferPlant[], others: (AnimalItem | TaskItem)[]) => Promise<void>;
  onRemove: (ids: string[]) => void;
  onUpdateGrowth: (id: string, growth: Growth) => void;
  onKeepAnimals: (id: string, kept: KeptAnimals) => void;
  deletedRef: MutableRefObject<Deleted>;
  onSync: (snapshot: SyncSnapshot) => Promise<MergeResult>;
  /** The seed inventory. */
  seeds: SeedPacket[];
  onImportSeeds: (seeds: SeedPacket[]) => Promise<void>;
  onTakeSeeds: (packetId: string, count: number) => void;
  /** Opens straight onto sending, with this seed packet ticked (from the seed inventory). */
  sendPacketId?: string | null;
}

type Step =
  | { kind: 'menu' }
  | { kind: 'send' }
  /**
   * `ids` are the plants, animals and tasks sent, `kept` what stays here for plants and `keptAnimals` for
   * animals only partly given away, and `given` how many seeds were given from each packet.
   */
  | {
      kind: 'sent';
      ids: string[];
      kept: Record<string, Growth>;
      keptAnimals: Record<string, KeptAnimals>;
      given: Record<string, number>;
    }
  | { kind: 'sync' }
  | { kind: 'receive'; received: Received | null }
  | { kind: 'received'; plants: number; animals: number; tasks: number; seeds: number }
  | { kind: 'synced'; result: MergeResult };

/** e.g. "2 plants, 1 animal, 1 task and 30 seeds". */
function describe(plants: number, animals: number, tasks: number, seeds: number): string {
  const parts = [
    plants ? plural(plants, 'plant') : '',
    animals ? plural(animals, 'animal') : '',
    tasks ? plural(tasks, 'task') : '',
    seeds ? plural(seeds, 'seed') : '',
  ].filter(Boolean);
  return parts.length < 2 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * Send plants, animals, tasks and seeds to another phone as a file (via WhatsApp, email, Bluetooth, …), add what
 * someone sent you, or sync everything with another phone by swapping sync files.
 */
export function TransferModal({
  visible,
  onClose,
  items,
  onImport,
  onRemove,
  onUpdateGrowth,
  onKeepAnimals,
  deletedRef,
  onSync,
  seeds,
  onImportSeeds,
  onTakeSeeds,
  sendPacketId,
}: Props) {
  const plants = items.filter((i): i is PlantItem => i.kind === 'plant');
  const animals = items.filter((i): i is AnimalItem => i.kind === 'animal');
  const tasks = items.filter((i): i is TaskItem => i.kind === 'task');
  const packets = seeds.filter((p) => p.count > 0);
  const [step, setStep] = useState<Step>({ kind: 'menu' });
  /** Ticked plants, animals, tasks and seed packets. */
  const [selected, setSelected] = useState<string[]>([]);
  /** How many plants, animals or seeds to give, for entries holding several (all of them when not set). */
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  /** Which named animals to give, for entries with names (all of them when not set). */
  const [giveNames, setGiveNames] = useState<Record<string, string[]>>({});
  const [includePhotos, setIncludePhotos] = useState(true);
  const [syncPhotos, setSyncPhotos] = useState<PhotoChoice>('recent');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setStep(sendPacketId ? { kind: 'send' } : { kind: 'menu' });
      setSelected(sendPacketId ? [sendPacketId] : []);
      setAmounts({});
      setGiveNames({});
      setIncludePhotos(true);
      setSyncPhotos('recent');
      setError(null);
    }
  }, [visible, sendPacketId]);

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

  const chosenPlants = plants.filter((p) => selected.includes(p.id));
  const chosenAnimals = animals.filter((a) => selected.includes(a.id));
  const chosenTasks = tasks.filter((t) => selected.includes(t.id));
  const chosenSeeds = packets.filter((p) => selected.includes(p.id));
  const chosenCount = chosenPlants.length + chosenAnimals.length + chosenTasks.length + chosenSeeds.length;
  const photoCount =
    [...chosenPlants, ...chosenAnimals, ...chosenSeeds].reduce((n, p) => n + p.photos.length, 0);
  const syncPhotoCount = (choice: PhotoChoice) =>
    [...plants, ...animals].reduce((n, p) => n + photosToSend(p.photos, choice).length, 0);
  const allIds = [...plants, ...animals, ...tasks, ...packets].map((i) => i.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.includes(id));
  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const amountOf = (p: PlantItem) => {
    const total = plantCount(p);
    return total === undefined ? undefined : Math.min(amounts[p.id] ?? total, total);
  };
  const seedAmountOf = (p: SeedPacket) => Math.min(amounts[p.id] ?? p.count, p.count);
  /** The named animals to give, or how many for unnamed ones. */
  const animalGiveOf = (a: AnimalItem): string[] | number =>
    a.names.length > 0
      ? a.names.filter((n) => (giveNames[a.id] ?? a.names).includes(n))
      : Math.min(amounts[a.id] ?? a.headCount, a.headCount);
  const givesAll = (a: AnimalItem) => {
    const give = animalGiveOf(a);
    return typeof give === 'number' ? give >= a.headCount : give.length === a.names.length;
  };
  const toggleName = (a: AnimalItem, name: string) =>
    setGiveNames((prev) => {
      const current = prev[a.id] ?? a.names;
      return { ...prev, [a.id]: current.includes(name) ? current.filter((n) => n !== name) : [...current, name] };
    });
  /** Named animals ticked to send with none of their names picked. */
  const noNamesPicked = chosenAnimals.some((a) => {
    const give = animalGiveOf(a);
    return typeof give !== 'number' && give.length === 0;
  });

  const send = () =>
    run(async () => {
      const kept: Record<string, Growth> = {};
      const sentPlants = chosenPlants.map((p) => {
        const give = amountOf(p);
        if (!p.growth || give === undefined || give >= plantCount(p)!) return p;
        const split = splitGrowth(p.growth, give);
        kept[p.id] = split.kept;
        return { ...p, growth: split.sent };
      });
      const keptAnimals: Record<string, KeptAnimals> = {};
      const sentAnimals = chosenAnimals.map((a) => {
        if (givesAll(a)) return a;
        const split = splitAnimal(a, animalGiveOf(a));
        keptAnimals[a.id] = split.kept;
        return split.sent;
      });
      const given = Object.fromEntries(chosenSeeds.map((p) => [p.id, seedAmountOf(p)]));
      const pick: TransferPick = {
        plants: sentPlants,
        animals: sentAnimals,
        tasks: chosenTasks,
        seeds: chosenSeeds.map((p) => ({ ...p, count: given[p.id] })),
      };
      await shareTransferFile(transferFileName(pick), await packItems(pick, includePhotos));
      const ids = [...chosenPlants, ...chosenAnimals, ...chosenTasks].map((i) => i.id);
      go({ kind: 'sent', ids, kept, keptAnimals, given });
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
      if (file.plants.length || file.animals.length || file.tasks.length) {
        await onImport(file.plants, [...file.animals, ...file.tasks]);
      }
      if (file.seeds.length) await onImportSeeds(file.seeds);
      go({
        kind: 'received',
        plants: file.plants.length,
        animals: file.animals.length,
        tasks: file.tasks.length,
        seeds: file.seeds.reduce((n, p) => n + p.count, 0),
      });
    });

  const photoSwitch = (count: number) =>
    count > 0 ? (
      <View style={styles.switchRow}>
        <View style={styles.flex}>
          <Text style={styles.switchLabel}>Include photos ({count})</Text>
          <Text style={styles.hint}>Photos make the file much bigger.</Text>
        </View>
        <Switch
          value={includePhotos}
          onValueChange={setIncludePhotos}
          trackColor={{ true: colors.plant, false: colors.border }}
        />
      </View>
    ) : null;

  let title = 'Send or receive';
  let body: ReactNode;
  let footer: ReactNode = null;

  switch (step.kind) {
    case 'menu':
      body = (
        <>
          <Text style={styles.help}>
            Move plants, animals and maintenance tasks to someone else's phone – with their whole history, tags and
            photos – share seeds from your inventory, or sync with a phone you share the garden with.
          </Text>
          <View style={styles.choiceRow}>
            <Choice
              emoji="📤"
              title="Send"
              desc="Share plants, animals, tasks or seeds as a file"
              onPress={() => go({ kind: 'send' })}
            />
            <Choice
              emoji="📥"
              title="Receive"
              desc="Add plants, animals, tasks or seeds someone sent you"
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

    case 'send': {
      title = 'Send';
      const amountPicker = (id: string, name: string, value: number, total: number, suffix: string) => (
        <View style={styles.amount}>
          <Text style={styles.amountLabel}>How many to give?</Text>
          <Stepper
            label={`${name} to give`}
            value={value}
            onChange={(n) => setAmounts((prev) => ({ ...prev, [id]: n }))}
            min={1}
            max={total}
            suffix={`of ${total}${suffix}`}
          />
          <Text style={styles.hint}>{value === total ? 'All of them' : `${total - value} stay with you`}</Text>
        </View>
      );
      body =
        allIds.length === 0 ? (
          <Text style={styles.help}>You don't have anything to send yet.</Text>
        ) : (
          <ScrollView style={styles.list}>
            <Pressable
              onPress={() => setSelected(allSelected ? [] : allIds)}
              style={({ pressed }) => [styles.selectAll, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={styles.selectAllText}>{allSelected ? 'Select none' : 'Select all'}</Text>
            </Pressable>
            {plants.length > 0 ? <Text style={styles.group}>🪴 Plants</Text> : null}
            {plants.map((p) => {
              const checked = selected.includes(p.id);
              const total = plantCount(p);
              return (
                <View key={p.id}>
                  <PlantRow plant={p} checked={checked} onPress={() => toggle(p.id)} />
                  {checked && total !== undefined && total > 1 ? amountPicker(p.id, p.name, amountOf(p)!, total, '') : null}
                </View>
              );
            })}
            {animals.length > 0 ? <Text style={styles.group}>🐾 Animals</Text> : null}
            {animals.map((a) => {
              const checked = selected.includes(a.id);
              const give = animalGiveOf(a);
              return (
                <View key={a.id}>
                  <AnimalRow animal={a} checked={checked} onPress={() => toggle(a.id)} />
                  {checked && typeof give === 'number' && a.headCount > 1
                    ? amountPicker(a.id, a.name, give, a.headCount, '')
                    : null}
                  {checked && typeof give !== 'number' && a.names.length > 1 ? (
                    <View style={styles.amount}>
                      <Text style={styles.amountLabel}>Which ones to give?</Text>
                      <View style={styles.nameChips}>
                        {a.names.map((n) => {
                          const on = give.includes(n);
                          return (
                            <Pressable
                              key={n}
                              onPress={() => toggleName(a, n)}
                              style={({ pressed }) => [styles.nameChip, on && styles.nameChipOn, pressed && styles.pressed]}
                              accessibilityRole="checkbox"
                              aria-checked={on}
                            >
                              <Text style={[styles.nameChipText, on && styles.nameChipTextOn]}>{n}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      <Text style={styles.hint}>
                        {give.length === 0
                          ? 'Tick at least one'
                          : give.length === a.names.length
                            ? 'All of them'
                            : `${joinNames(a.names.filter((n) => !give.includes(n)))} ${a.names.length - give.length === 1 ? 'stays' : 'stay'} with you`}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
            {tasks.length > 0 ? <Text style={styles.group}>🛠️ Maintenance</Text> : null}
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} checked={selected.includes(t.id)} onPress={() => toggle(t.id)} />
            ))}
            {packets.length > 0 ? <Text style={styles.group}>🌰 Seeds</Text> : null}
            {packets.map((p) => {
              const checked = selected.includes(p.id);
              return (
                <View key={p.id}>
                  <SeedRow packet={p} checked={checked} onPress={() => toggle(p.id)} />
                  {checked && p.count > 1 ? amountPicker(p.id, `${p.name} seeds`, seedAmountOf(p), p.count, ' seeds') : null}
                </View>
              );
            })}
            {photoSwitch(photoCount)}
            {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
          </ScrollView>
        );
      footer = (
        <>
          <Button label="Back" variant="secondary" onPress={() => go({ kind: 'menu' })} />
          <Button
            label={busy ? 'Preparing…' : chosenCount > 1 ? `Send ${chosenCount} items` : 'Send'}
            onPress={send}
            disabled={busy || chosenCount === 0 || noNamesPicked}
          />
        </>
      );
      break;
    }

    case 'sent': {
      const { ids, kept, keptAnimals, given } = step;
      const whole = ids.filter((id) => !kept[id] && !keptAnimals[id]);
      const split = ids.filter((id) => kept[id]);
      const splitAnimals = ids.filter((id) => keptAnimals[id]);
      const seedIds = Object.keys(given);
      const one = ids.length + seedIds.length === 1;
      const nameOf = (id: string) => items.find((i) => i.id === id)?.name;
      body = (
        <>
          <Text style={styles.help}>
            Once the other person has added {one ? 'it' : 'them'} on their phone (📥 Receive), update yours to finish
            handing {one ? 'it' : 'them'} over – or keep a copy if you're both looking after {one ? 'it' : 'them'}.
          </Text>
          {whole.map((id) =>
            nameOf(id) ? (
              <Text key={id} style={[styles.hint, styles.spaced]}>
                {nameOf(id)}: will be removed from your phone.
              </Text>
            ) : null,
          )}
          {split.map((id) => {
            const plant = plants.find((p) => p.id === id);
            return plant ? (
              <Text key={id} style={[styles.hint, styles.spaced]}>
                {plant.name}: {plantCount({ ...plant, growth: kept[id] })} will stay with you.
              </Text>
            ) : null;
          })}
          {splitAnimals.map((id) => {
            const left = keptAnimals[id];
            return (
              <Text key={id} style={[styles.hint, styles.spaced]}>
                {nameOf(id)}:{' '}
                {left.names.length
                  ? `${joinNames(left.names)} ${left.names.length === 1 ? 'stays' : 'stay'} with you.`
                  : `${left.headCount} will stay with you.`}
              </Text>
            );
          })}
          {seedIds.map((id) => {
            const packet = seeds.find((p) => p.id === id);
            return packet ? (
              <Text key={id} style={[styles.hint, styles.spaced]}>
                {packet.name}: {plural(Math.max(0, packet.count - given[id]), 'seed')} will stay with you.
              </Text>
            ) : null;
          })}
        </>
      );
      title = 'Sent?';
      const onlyRemoves = split.length === 0 && splitAnimals.length === 0 && seedIds.length === 0;
      footer = (
        <>
          <Button label="Keep a copy" variant="secondary" onPress={onClose} />
          <Button
            label={onlyRemoves ? 'Remove from my phone' : 'Update my phone'}
            variant={onlyRemoves ? 'danger' : 'primary'}
            onPress={() => {
              split.forEach((id) => onUpdateGrowth(id, kept[id]));
              splitAnimals.forEach((id) => onKeepAnimals(id, keptAnimals[id]));
              if (whole.length) onRemove(whole);
              seedIds.forEach((id) => onTakeSeeds(id, given[id]));
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
              Ask the other person to tap 📤 Send or 🔄 Sync. When the file arrives (e.g. in WhatsApp or your email),
              save it to your phone, then choose it here.
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
        const seedTotal = file.seeds.reduce((n, p) => n + p.count, 0);
        const count = file.plants.length + file.animals.length + file.tasks.length + file.seeds.length;
        const onlySeeds = count === file.seeds.length;
        if (onlySeeds) title = 'Receive seeds';
        body = (
          <ScrollView style={styles.list}>
            <Text style={styles.help}>
              {count === 1 ? 'This' : 'These'} will be added to your{' '}
              {onlySeeds ? 'seed inventory' : file.seeds.length ? 'list and seed inventory' : 'list'}:
            </Text>
            {file.plants.map((p, i) => (
              <PlantRow key={`${p.id}-${i}`} plant={p} />
            ))}
            {file.animals.map((a, i) => (
              <AnimalRow key={`${a.id}-${i}`} animal={a} />
            ))}
            {file.tasks.map((t, i) => (
              <TaskRow key={`${t.id}-${i}`} task={t} />
            ))}
            {file.seeds.map((p, i) => (
              <SeedRow key={`${p.id}-${i}`} packet={p} />
            ))}
            {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
          </ScrollView>
        );
        footer = (
          <>
            <Button label="Cancel" variant="secondary" onPress={() => go({ kind: 'receive', received: null })} />
            <Button
              label={
                busy
                  ? 'Adding…'
                  : onlySeeds
                    ? `Add ${plural(seedTotal, 'seed')}`
                    : count === 1
                      ? file.plants.length
                        ? 'Add plant'
                        : file.animals.length
                          ? 'Add animals'
                          : 'Add task'
                      : `Add ${count} items`
              }
              onPress={() => receive(file)}
              disabled={busy}
            />
          </>
        );
      }
      break;

    case 'received': {
      const { plants: p, animals: a, tasks: t, seeds: n } = step;
      const one = p + a + t + n === 1;
      title = 'Added';
      body = (
        <Text style={styles.help}>
          ✅ {describe(p, a, t, n)} {one ? 'was' : 'were'} added
          {p || a || t ? ` to your list${n ? ' and seed inventory' : ''}` : ' to your seed inventory'}. Let the sender know so
          they can take {one ? 'it' : 'them'} off their phone.
        </Text>
      );
      footer = <Button label="Done" onPress={onClose} />;
      break;
    }

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

function SeedRow({ packet, checked, onPress }: { packet: SeedPacket; checked?: boolean; onPress?: () => void }) {
  const crop = findCrop(packet.cropId);
  const photo = packet.photos[0];
  let detail = plural(packet.count, 'seed');
  if (crop && crop.name !== packet.name) detail = `${crop.name} · ${detail}`;
  if (packet.photos.length > 0) detail += ` · ${plural(packet.photos.length, 'photo')}`;
  const content = (
    <>
      {photo ? (
        <Image source={{ uri: photo.uri }} style={styles.rowPhoto} />
      ) : (
        <Text style={styles.rowEmoji}>{crop?.emoji ?? '🌰'}</Text>
      )}
      <View style={styles.flex}>
        <Text style={styles.rowName} numberOfLines={1}>
          {packet.name}
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
      accessibilityLabel={`${packet.name}, ${plural(packet.count, 'seed')}`}
    >
      {content}
    </Pressable>
  );
}

function AnimalRow({ animal, checked, onPress }: { animal: AnimalItem; checked?: boolean; onPress?: () => void }) {
  let detail = animal.headCount === 1 ? animal.species : `${animal.species} · ${plural(animal.headCount, 'animal')}`;
  if (animal.names.length > 0 && animal.names.join(' ') !== animal.name) detail += ` · ${joinNames(animal.names)}`;
  if (animal.photos.length > 0) detail += ` · ${plural(animal.photos.length, 'photo')}`;
  const photo = animal.photos[0];
  const content = (
    <>
      {photo ? (
        <Image source={{ uri: photo.uri }} style={styles.rowPhoto} />
      ) : (
        <Text style={styles.rowEmoji}>{speciesEmoji(animal.species)}</Text>
      )}
      <View style={styles.flex}>
        <Text style={styles.rowName} numberOfLines={1}>
          {animal.name}
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
      accessibilityLabel={animal.name}
    >
      {content}
    </Pressable>
  );
}

function TaskRow({ task, checked, onPress }: { task: TaskItem; checked?: boolean; onPress?: () => void }) {
  const content = (
    <>
      <Text style={styles.rowEmoji}>🛠️</Text>
      <View style={styles.flex}>
        <Text style={styles.rowName} numberOfLines={1}>
          {task.name}
        </Text>
        <Text style={styles.rowDetail} numberOfLines={1}>
          Every {plural(task.everyDays, 'day')}
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
      accessibilityLabel={task.name}
    >
      {content}
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
  nameChips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 4 },
  nameChip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  nameChipOn: { backgroundColor: colors.plant, borderColor: colors.plant },
  nameChipText: { fontSize: 15, fontWeight: '600', color: colors.text },
  nameChipTextOn: { color: colors.primaryText },
  group: { fontSize: 14, fontWeight: '700', color: colors.muted, marginTop: 14 },
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
  rowPhoto: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.background },
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
