import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { findCrop } from '../crops';
import { relativeDay } from '../dates';
import { growthStatus } from '../growth';
import { GREENHOUSE, lotEmoji, lotOf, sameLot } from '../lots';
import { plantSummary } from '../stats';
import { colors, radius } from '../theme';
import { PlantItem, PlantPhoto, TrackedItem } from '../types';
import { Button } from './Button';
import { PhotoLog } from './PhotoLog';
import { PhotoViewer } from './PhotoViewer';
import { Sheet } from './Sheet';

interface Props {
  /** The lot being shown; null when closed. */
  lot: string | null;
  items: TrackedItem[];
  photos: PlantPhoto[];
  onClose: () => void;
  /** Opens a plant's own details. */
  onOpenPlant: (id: string) => void;
  onWater: (ids: string[]) => void;
  onFeed: () => void;
  onRename: (from: string, to: string) => void;
  onAddPhoto: (pickedUri: string) => Promise<void>;
  onSetPhotoDate: (photoId: string, takenAt: string) => void;
  onRemovePhoto: (photoId: string) => void;
}

type View_ = { kind: 'main' } | { kind: 'rename' } | { kind: 'photo'; id: string };

/** A lot's (or the greenhouse's) details: how it's doing, what's planted in it, its photos, and renaming it. */
export function LotDetailModal(props: Props) {
  const { lot, items, photos, onClose } = props;
  const [view, setView] = useState<View_>({ kind: 'main' });
  const [newName, setNewName] = useState('');

  useEffect(() => setView({ kind: 'main' }), [lot]);

  if (!lot) return null;
  const isGreenhouse = sameLot(lot, GREENHOUSE);
  const title = `${lotEmoji(lot)}  ${lot}`;
  const subtitle = isGreenhouse ? 'Greenhouse' : 'Lot';
  const back = () => setView({ kind: 'main' });

  const plants = items.filter((i): i is PlantItem => i.kind === 'plant' && sameLot(lotOf(i), lot));
  const growing = plants.filter((p) => !p.growth?.harvestedAt);
  const harvested = plants.filter((p) => p.growth?.harvestedAt);
  const due = growing.filter((p) => plantSummary(p).status !== 'ok').length;
  const lastWatered = newest(growing.map((p) => p.waterings[0]));
  const lastFed = newest(growing.map((p) => p.inputs[0]?.date));
  const seedsSown = plants.reduce((n, p) => n + (p.growth?.seedsSown ?? 0), 0);
  const stats = [
    { label: 'Growing', value: String(growing.length) },
    { label: 'Water due', value: String(due) },
    { label: 'Harvested', value: String(harvested.length) },
  ];
  const moreStats = [
    { label: 'Last watered', value: lastWatered ? capitalize(relativeDay(lastWatered)) : 'Never' },
    { label: 'Last fed', value: lastFed ? capitalize(relativeDay(lastFed)) : 'Never' },
    { label: 'Seeds sown', value: String(seedsSown) },
  ];

  if (view.kind === 'rename') {
    const trimmed = newName.trim();
    const save = () => {
      if (!trimmed || sameLot(trimmed, GREENHOUSE)) return;
      props.onRename(lot, trimmed);
    };
    return (
      <Sheet
        visible
        onClose={onClose}
        subtitle={subtitle}
        title={title}
        footer={
          <>
            <Button label="Cancel" variant="secondary" onPress={back} />
            <Button label="Save" onPress={save} disabled={!trimmed || sameLot(trimmed, GREENHOUSE)} />
          </>
        }
      >
        <Text style={styles.renameLabel}>Name</Text>
        <TextInput
          value={newName}
          onChangeText={setNewName}
          placeholder="e.g. North field"
          placeholderTextColor={colors.muted}
          style={styles.renameInput}
          autoFocus
          selectTextOnFocus
          returnKeyType="done"
          onSubmitEditing={save}
          maxLength={30}
        />
        <Text style={styles.note}>
          Every plant in this lot moves to the new name. Using the name of another lot joins the two.
        </Text>
      </Sheet>
    );
  }

  const photo = view.kind === 'photo' ? photos.find((p) => p.id === view.id) : undefined;
  if (photo) {
    return (
      <Sheet visible onClose={onClose} subtitle={subtitle} title={title}>
        <ScrollView style={styles.body}>
          <PhotoViewer
            key={photo.id}
            photo={photo}
            onClose={back}
            onChangeDate={(takenAt) => props.onSetPhotoDate(photo.id, takenAt)}
            onDelete={() => {
              props.onRemovePhoto(photo.id);
              back();
            }}
          />
        </ScrollView>
      </Sheet>
    );
  }

  return (
    <Sheet
      visible
      onClose={onClose}
      subtitle={subtitle}
      title={title}
      footer={
        isGreenhouse ? undefined : (
          <Button
            label="✏️  Rename lot"
            variant="secondary"
            onPress={() => {
              setNewName(lot);
              setView({ kind: 'rename' });
            }}
          />
        )
      }
    >
      <ScrollView style={styles.body}>
        <View style={styles.stats}>
          {stats.map((s) => (
            <Stat key={s.label} {...s} warn={s.label === 'Water due' && due > 0} />
          ))}
        </View>
        <View style={[styles.stats, styles.statsMore]}>
          {moreStats.map((s) => (
            <Stat key={s.label} {...s} />
          ))}
        </View>

        {growing.length > 0 && (
          <View style={styles.actionRow}>
            <Button label="💧  Water lot" color={colors.water} onPress={() => props.onWater(growing.map((p) => p.id))} />
            <Button label="🧪  Feed lot" color={colors.input} onPress={props.onFeed} />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Planted here</Text>
          {growing.length === 0 ? (
            <Text style={styles.empty}>Nothing growing here right now.</Text>
          ) : (
            growing.map((p) => <PlantRow key={p.id} plant={p} onPress={() => props.onOpenPlant(p.id)} />)
          )}
          {harvested.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, styles.subTitle]}>Harvested</Text>
              {harvested.map((p) => (
                <PlantRow key={p.id} plant={p} onPress={() => props.onOpenPlant(p.id)} />
              ))}
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <PhotoLog
            photos={photos}
            onAdd={props.onAddPhoto}
            onOpen={(p) => setView({ kind: 'photo', id: p.id })}
            emptyText="No photos of this lot yet."
          />
        </View>
      </ScrollView>
    </Sheet>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, warn && { color: colors.warning }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** One plant in the lot: its photo or crop emoji, name and where it's at. Tap to open its details. */
function PlantRow({ plant, onPress }: { plant: PlantItem; onPress: () => void }) {
  const crop = plant.growth && findCrop(plant.growth.cropId);
  const status = plant.growth && growthStatus(plant.growth);
  const summary = plantSummary(plant);
  const line = status ? `${status.emoji} ${status.headline}` : `💧 ${summary.dueLabel}`;
  const late = status ? status.needsAction : summary.status !== 'ok';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
      accessibilityRole="button"
      accessibilityLabel={`${plant.name}, ${line}`}
    >
      {plant.photos[0] ? (
        <Image source={{ uri: plant.photos[0].uri }} style={styles.thumb} />
      ) : (
        <Text style={styles.rowEmoji}>{crop?.emoji ?? '🪴'}</Text>
      )}
      <View style={styles.shrink}>
        <Text style={styles.rowName} numberOfLines={1}>
          {plant.name}
        </Text>
        <Text style={[styles.rowLine, late && { color: colors.warning }]} numberOfLines={1}>
          {line}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const newest = (dates: (string | undefined)[]) =>
  dates.reduce<string | undefined>((a, d) => (d && (!a || d > a) ? d : a), undefined);

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const styles = StyleSheet.create({
  body: { flexShrink: 1 },
  renameLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  renameInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  note: { fontSize: 13, color: colors.muted, marginTop: 8, lineHeight: 18 },
  stats: { flexDirection: 'row', gap: 8 },
  statsMore: { marginTop: 8 },
  stat: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statValue: { fontSize: 16, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 2, textAlign: 'center' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 8 },
  subTitle: { marginTop: 16 },
  empty: { fontSize: 14, color: colors.muted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  thumb: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background },
  rowEmoji: { fontSize: 26, width: 40, textAlign: 'center' },
  shrink: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 15, fontWeight: '700', color: colors.text },
  rowLine: { fontSize: 13, color: colors.muted, marginTop: 2 },
  chevron: { fontSize: 22, color: colors.muted },
});
