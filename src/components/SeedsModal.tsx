import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { CROPS, findCrop } from '../crops';
import { plural } from '../dates';
import { colors, radius } from '../theme';
import { SeedPacket } from '../types';
import { OTHER_SEED } from '../useSeeds';
import { Button } from './Button';
import { PhotoLog } from './PhotoLog';
import { PhotoViewer } from './PhotoViewer';
import { Sheet } from './Sheet';
import { Stepper } from './Stepper';

interface Props {
  visible: boolean;
  onClose: () => void;
  packets: SeedPacket[];
  /** Returns the id of the packet the seeds went into. */
  onAdd: (cropId: string, name: string, count: number) => string;
  onSetCount: (id: string, count: number) => void;
  onRemove: (id: string) => void;
  onAddPhoto: (id: string, pickedUri: string) => Promise<void>;
  onSetPhotoDate: (id: string, photoId: string, takenAt: string) => void;
  onRemovePhoto: (id: string, photoId: string) => void;
  /** Opens "Send" with this packet ticked. */
  onSend: (id: string) => void;
}

/** What the popup is showing: all packets, the add form, one packet, or one of its photos. */
type View_ =
  | { kind: 'list' }
  | { kind: 'add' }
  | { kind: 'packet'; id: string }
  | { kind: 'photo'; id: string; photoId: string };

const MAX_SEEDS = 9999;
const QUICK_COUNTS = [10, 25, 50, 100];

/** The seed inventory: packets on hand (with photos of each packet), and a form to add more. */
export function SeedsModal(props: Props) {
  const { visible, onClose, packets, onAdd, onSetCount, onRemove } = props;
  const [view, setView] = useState<View_>({ kind: 'list' });
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [cropId, setCropId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [count, setCount] = useState(10);

  // Opened from the Add menu, so start on the add form; the packets on hand are a tap away.
  useEffect(() => {
    if (visible) startAdding();
  }, [visible]);

  const open = (next: View_) => {
    setConfirmRemove(false);
    setView(next);
  };

  const startAdding = () => {
    setCropId(null);
    setName('');
    setCount(10);
    open({ kind: 'add' });
  };

  const chooseCrop = (id: string) => {
    const old = findCrop(cropId ?? undefined);
    // Keep a variety name the user typed, but swap in the new crop's name if it was ours.
    if (!name.trim() || name.trim() === old?.name) setName(findCrop(id)?.name ?? '');
    setCropId(id);
  };

  const trimmed = name.trim();
  const save = () => {
    if (!cropId || !trimmed) return;
    // Open the packet so a photo of it can be taken straight away.
    open({ kind: 'packet', id: onAdd(cropId, trimmed, count) });
  };

  const total = packets.reduce((n, p) => n + p.count, 0);
  // Group packets by crop, in catalog order, with "other" seeds last.
  const order = (p: SeedPacket) => {
    const i = CROPS.findIndex((c) => c.id === p.cropId);
    return i < 0 ? CROPS.length : i;
  };
  const sorted = [...packets].sort((a, b) => order(a) - order(b) || a.name.localeCompare(b.name));

  const packet = view.kind === 'packet' || view.kind === 'photo' ? packets.find((p) => p.id === view.id) : undefined;

  if (view.kind === 'photo' && packet) {
    const photo = packet.photos.find((ph) => ph.id === view.photoId);
    if (photo) {
      return (
        <Sheet visible={visible} onClose={onClose} subtitle={packet.name} title="Packet photo">
          <PhotoViewer
            key={photo.id}
            photo={photo}
            onClose={() => open({ kind: 'packet', id: packet.id })}
            onChangeDate={(takenAt) => props.onSetPhotoDate(packet.id, photo.id, takenAt)}
            onDelete={() => {
              props.onRemovePhoto(packet.id, photo.id);
              open({ kind: 'packet', id: packet.id });
            }}
          />
        </Sheet>
      );
    }
  }

  if (packet) {
    const crop = findCrop(packet.cropId);
    return (
      <Sheet
        visible={visible}
        onClose={onClose}
        subtitle={crop && crop.name !== packet.name ? `${crop.emoji} ${crop.name}` : 'Seed inventory'}
        title={packet.name}
        footer={
          confirmRemove ? (
            <>
              <Button label="Keep" variant="secondary" onPress={() => setConfirmRemove(false)} />
              <Button
                label="Yes, remove"
                variant="danger"
                onPress={() => {
                  onRemove(packet.id);
                  open({ kind: 'list' });
                }}
              />
            </>
          ) : (
            <>
              <Button label="Back" variant="secondary" onPress={() => open({ kind: 'list' })} />
              <Button
                label="📤 Send seeds"
                color={colors.plant}
                disabled={packet.count === 0}
                onPress={() => props.onSend(packet.id)}
              />
            </>
          )
        }
      >
        <ScrollView style={styles.shrink}>
          <Text style={[styles.label, styles.firstLabel]}>Photos of the packet</Text>
          <PhotoLog
            photos={packet.photos}
            onAdd={(uri) => props.onAddPhoto(packet.id, uri)}
            onOpen={(ph) => open({ kind: 'photo', id: packet.id, photoId: ph.id })}
            emptyText="No photos yet – snap the front and back of the packet to keep the variety and sowing notes."
          />

          <Text style={styles.label}>Seeds left</Text>
          <Stepper
            label={`${packet.name} seeds`}
            value={packet.count}
            onChange={(n) => onSetCount(packet.id, n)}
            min={0}
            max={MAX_SEEDS}
            suffix={packet.count === 1 ? 'seed' : 'seeds'}
          />

          <Pressable
            onPress={() => setConfirmRemove(true)}
            style={({ pressed }) => [styles.removePacket, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.removePacketText}>🗑️ Remove this packet</Text>
          </Pressable>
        </ScrollView>
      </Sheet>
    );
  }

  if (view.kind === 'add') {
    return (
      <Sheet
        visible={visible}
        onClose={onClose}
        subtitle="Seed inventory"
        title="Add seeds"
        footer={
          <>
            <Button
              label={packets.length ? '🌰 My seeds' : 'Cancel'}
              variant="secondary"
              onPress={() => (packets.length ? open({ kind: 'list' }) : onClose())}
            />
            <Button label="Add seeds" color={colors.plant} disabled={!cropId || !trimmed} onPress={save} />
          </>
        }
      >
        <ScrollView style={styles.shrink} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, styles.firstLabel]}>What seeds?</Text>
          <View style={styles.chips}>
            {CROPS.map((c) => (
              <Chip key={c.id} label={`${c.emoji} ${c.name}`} selected={cropId === c.id} onPress={() => chooseCrop(c.id)} />
            ))}
            <Chip label="🪴 Other" selected={cropId === OTHER_SEED} onPress={() => chooseCrop(OTHER_SEED)} />
          </View>

          <Text style={styles.label}>Name or variety</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={cropId === OTHER_SEED ? 'e.g. Sunflower' : 'e.g. Cherry tomato'}
            placeholderTextColor={colors.muted}
            style={styles.input}
            maxLength={60}
          />

          <Text style={styles.label}>How many seeds?</Text>
          <Stepper
            label="Number of seeds"
            value={count}
            onChange={setCount}
            max={MAX_SEEDS}
            suffix={count === 1 ? 'seed' : 'seeds'}
          />
          <View style={[styles.chips, styles.spaced]}>
            {QUICK_COUNTS.map((n) => (
              <Chip key={n} label={String(n)} selected={count === n} onPress={() => setCount(n)} />
            ))}
          </View>
          <Text style={styles.hint}>
            Adding seeds of the same name tops up the existing packet. Next you can take a photo of the packet.
          </Text>
        </ScrollView>
      </Sheet>
    );
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      subtitle={`${plural(total, 'seed')} on hand`}
      title="Seed inventory"
      footer={<Button label="＋ Add seeds" color={colors.plant} onPress={startAdding} />}
    >
      <ScrollView style={styles.shrink}>
        {sorted.map((p) => {
          const crop = findCrop(p.cropId);
          const meta = [
            crop && crop.name !== p.name ? crop.name : '',
            p.photos.length ? plural(p.photos.length, 'photo') : '',
          ].filter(Boolean);
          return (
            <Pressable
              key={p.id}
              onPress={() => open({ kind: 'packet', id: p.id })}
              style={({ pressed }) => [styles.packet, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`${p.name}, ${plural(p.count, 'seed')}`}
            >
              {p.photos[0] ? (
                <Image source={{ uri: p.photos[0].uri }} style={styles.packetPhoto} />
              ) : (
                <View style={styles.packetIcon}>
                  <Text style={styles.packetEmoji}>{crop?.emoji ?? '🌰'}</Text>
                </View>
              )}
              <View style={styles.packetInfo}>
                <Text style={styles.packetName} numberOfLines={2}>
                  {p.name}
                </Text>
                {meta.length ? <Text style={styles.packetMeta}>{meta.join(' · ')}</Text> : null}
              </View>
              <Text style={[styles.packetCount, p.count === 0 && styles.none]}>
                {p.count === 0 ? 'None left' : plural(p.count, 'seed')}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          );
        })}
        <Text style={styles.hint}>
          Tap a packet to add photos, change how many are left or send some. Seeds you sow when adding a plant are taken
          out of here.
        </Text>
      </ScrollView>
    </Sheet>
  );
}

function Chip(props: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={props.onPress}
      style={[styles.chip, props.selected && styles.chipOn]}
      accessibilityRole="button"
      aria-selected={props.selected}
    >
      <Text style={[styles.chipText, props.selected && styles.chipTextOn]}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shrink: { flexShrink: 1 },
  pressed: { opacity: 0.7 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8, marginTop: 18 },
  firstLabel: { marginTop: 0 },
  spaced: { marginTop: 10 },
  hint: { fontSize: 13, color: colors.muted, marginTop: 12 },
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.plant, borderColor: colors.plant },
  chipText: { fontSize: 14, color: colors.text, fontWeight: '500' },
  chipTextOn: { color: colors.primaryText },
  packet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  packetIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.plantSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packetPhoto: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: colors.background },
  packetEmoji: { fontSize: 26 },
  packetInfo: { flex: 1, minWidth: 0 },
  packetName: { fontSize: 15, fontWeight: '600', color: colors.text },
  packetMeta: { fontSize: 12, color: colors.muted, marginTop: 1 },
  packetCount: { fontSize: 15, fontWeight: '700', color: colors.text },
  none: { color: colors.muted, fontWeight: '500' },
  chevron: { fontSize: 22, color: colors.muted, marginLeft: 2 },
  removePacket: { alignSelf: 'flex-start', marginTop: 24, paddingVertical: 6 },
  removePacketText: { fontSize: 15, fontWeight: '600', color: colors.danger },
});
