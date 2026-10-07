import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { findCrop } from '../crops';
import { formatDateTime } from '../dates';
import { growthStatus, MilestoneKey, StageAction, transplantSuccess } from '../growth';
import { animalSummary, plantSummary } from '../stats';
import { colors, radius } from '../theme';
import { Growth, TrackedItem } from '../types';
import { Button } from './Button';
import { CropGuide } from './CropGuide';
import { Journey } from './Journey';
import { MilestoneEditor } from './MilestoneEditor';
import { PhotoLog } from './PhotoLog';
import { PhotoViewer } from './PhotoViewer';
import { Sheet } from './Sheet';
import { Stepper } from './Stepper';

interface Props {
  item: TrackedItem | null;
  onClose: () => void;
  onWater: (id: string) => void;
  onLogEggs: (id: string, count: number) => void;
  onFeed: (id: string) => void;
  onAdvance: (id: string, action: StageAction) => void;
  onUpdateGrowth: (id: string, growth: Growth) => void;
  onAddPhoto: (id: string, pickedUri: string) => Promise<void>;
  onSetPhotoDate: (id: string, photoId: string, takenAt: string) => void;
  onRemovePhoto: (id: string, photoId: string) => void;
  onUndo: (id: string) => void;
  onDelete: (id: string) => void;
}

/** What the popup is showing: the overview, a stage's date picker, or one photo. */
type View_ = { kind: 'main' } | { kind: 'milestone'; key: MilestoneKey } | { kind: 'photo'; id: string };

export function ItemDetailModal(props: Props) {
  const { item, onClose, onWater, onLogEggs, onFeed, onAdvance, onUndo, onDelete } = props;
  const [eggCount, setEggCount] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [view, setView] = useState<View_>({ kind: 'main' });
  /** Seedlings to record when marking as transplanted; null means "all of them". */
  const [transplantCount, setTransplantCount] = useState<number | null>(null);

  useEffect(() => {
    setEggCount(1);
    setConfirmDelete(false);
    setShowGuide(false);
    setView({ kind: 'main' });
    setTransplantCount(null);
  }, [item?.id]);

  if (!item) return null;
  const isPlant = item.kind === 'plant';

  let stats: { label: string; value: string }[];
  let history: { key: string; date: string; text: string; undoable: boolean }[];
  let subtitle = isPlant ? 'Plant' : '';
  let icon = isPlant ? '🪴' : '🐔';
  const growth = item.kind === 'plant' ? item.growth : undefined;
  const status = growth && growthStatus(growth);
  const crop = growth && findCrop(growth.cropId);
  const seedsSown = growth?.seedsSown;
  const success = growth && transplantSuccess(growth);
  const seedlingsToTransplant = seedsSown ? Math.min(transplantCount ?? seedsSown, seedsSown) : undefined;
  if (item.kind === 'plant') {
    const s = plantSummary(item);
    stats = [
      { label: 'Schedule', value: `Every ${item.waterEveryDays}d` },
      {
        label: 'Water due',
        value:
          s.daysUntilDue === null
            ? 'Now'
            : s.daysUntilDue === 0
              ? 'Today'
              : s.daysUntilDue > 0
                ? `In ${s.daysUntilDue}d`
                : `${-s.daysUntilDue}d late`,
      },
      { label: 'Times watered', value: String(item.waterings.length) },
    ];
    history = item.waterings.map((d, i) => ({
      key: `water-${d}-${i}`,
      date: d,
      text: `💧  Watered · ${formatDateTime(d)}`,
      undoable: true,
    }));
    if (growth) {
      icon = crop?.emoji ?? icon;
      subtitle = `${crop?.name ?? 'Crop'} · ${growth.method === 'direct' ? 'sown directly' : 'seed tray → transplant'}`;
      const events: [string | undefined, string, boolean][] = [
        [growth.sownAt, growth.method === 'direct' ? '🌰  Sown in the ground' : '🌰  Sown in seed tray', false],
        [growth.sproutedAt, '🌱  Marked as seedling', true],
        [
          growth.transplantedAt,
          success ? `🪴  Transplanted ${success.transplanted} of ${success.sown}` : '🪴  Transplanted',
          true,
        ],
        [growth.harvestedAt, '🧺  Harvested', true],
      ];
      for (const [date, label, undoable] of events) {
        if (date) history.push({ key: label, date, text: `${label} · ${formatDateTime(date)}`, undoable });
      }
      history.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    }
  } else {
    subtitle = `${item.headCount} × ${item.species}`;
    const s = animalSummary(item);
    stats = [
      { label: 'Last fed', value: s.lastFedLabel.replace(/^Fed /, '') },
      { label: 'Eggs today', value: String(s.today) },
      { label: 'Eggs / week', value: String(s.last7Days) },
      { label: 'Eggs total', value: String(s.total) },
    ];
    // Feedings and egg logs share one timeline, newest first.
    history = [
      ...item.eggs.map((e, i) => ({
        key: `egg-${e.date}-${i}`,
        date: e.date,
        text: `🥚  ${e.count} egg${e.count === 1 ? '' : 's'} · ${formatDateTime(e.date)}`,
        undoable: true,
      })),
      ...item.feedings.map((d, i) => ({
        key: `feed-${d}-${i}`,
        date: d,
        text: `🌾  Fed · ${formatDateTime(d)}`,
        undoable: true,
      })),
    ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }

  const back = () => setView({ kind: 'main' });
  const photo = view.kind === 'photo' && item.kind === 'plant' ? item.photos.find((p) => p.id === view.id) : undefined;

  if (view.kind === 'milestone' && growth) {
    return (
      <Sheet visible onClose={onClose} subtitle={subtitle} title={`${icon}  ${item.name}`}>
        <ScrollView style={styles.body}>
          <MilestoneEditor
            growth={growth}
            crop={crop}
            stepKey={view.key}
            onCancel={back}
            onSave={(g) => {
              props.onUpdateGrowth(item.id, g);
              back();
            }}
          />
        </ScrollView>
      </Sheet>
    );
  }

  if (photo) {
    return (
      <Sheet visible onClose={onClose} subtitle={subtitle} title={`${icon}  ${item.name}`}>
        <ScrollView style={styles.body}>
          <PhotoViewer
            key={photo.id}
            photo={photo}
            sownAt={growth?.sownAt}
            onClose={back}
            onChangeDate={(takenAt) => props.onSetPhotoDate(item.id, photo.id, takenAt)}
            onDelete={() => {
              props.onRemovePhoto(item.id, photo.id);
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
      title={`${icon}  ${item.name}`}
      footer={
        confirmDelete ? (
          <>
            <Button label="Cancel" variant="secondary" onPress={() => setConfirmDelete(false)} />
            <Button
              label="Yes, delete"
              variant="danger"
              onPress={() => {
                onDelete(item.id);
                onClose();
              }}
            />
          </>
        ) : (
          <Button
            label={`Delete ${isPlant ? 'plant' : 'animals'}`}
            variant="danger"
            onPress={() => setConfirmDelete(true)}
          />
        )
      }
    >
      <ScrollView style={styles.body}>
        {status && (
          <View style={styles.growth}>
            <Journey steps={status.steps} onStepPress={(key) => setView({ kind: 'milestone', key })} />
            <Text style={styles.journeyHint}>Tap a stage to change its date</Text>
            <Text
              style={[
                styles.growthHeadline,
                {
                  color:
                    status.stage === 'harvested' ? colors.muted : status.needsAction ? colors.warning : colors.plant,
                },
              ]}
            >
              {status.emoji} {status.headline}
            </Text>
            {status.nextAction === 'sprouted' && (
              <Text style={styles.growthNote}>
                {growth?.daysToSeedlingMax
                  ? 'Germination can be slow and uneven – tap below when you see the first leaves.'
                  : 'The seedling stage starts automatically on the estimated date. Sprouted early? Mark it below.'}
              </Text>
            )}
            {status.nextAction === 'transplanted' && (
              <Text style={styles.growthNote}>The harvest countdown starts once you mark it as transplanted.</Text>
            )}
            {status.nextAction === 'transplanted' && seedsSown !== undefined && (
              <View style={styles.countBlock}>
                <Text style={styles.countLabel}>How many seedlings made it?</Text>
                <Stepper
                  label="Seedlings to transplant"
                  value={seedlingsToTransplant!}
                  onChange={setTransplantCount}
                  min={0}
                  max={seedsSown}
                  suffix={`of ${seedsSown}`}
                />
              </View>
            )}
            {status.nextAction && (
              <View style={styles.actionRow}>
                <Button
                  {...STAGE_BUTTON[status.nextAction]}
                  variant={status.nextAction === 'sprouted' ? 'secondary' : 'primary'}
                  color={status.needsAction ? colors.warning : colors.plant}
                  onPress={() =>
                    status.nextAction === 'transplanted' && seedlingsToTransplant !== undefined
                      ? props.onUpdateGrowth(item.id, {
                          ...growth!,
                          transplantedAt: new Date().toISOString(),
                          transplantedCount: seedlingsToTransplant,
                        })
                      : onAdvance(item.id, status.nextAction!)
                  }
                />
              </View>
            )}
            {crop && (
              <>
                <Text
                  style={styles.guideToggle}
                  onPress={() => setShowGuide((v) => !v)}
                  accessibilityRole="button"
                  aria-expanded={showGuide}
                >
                  📖 Growing guide {showGuide ? '▾' : '▸'}
                </Text>
                {showGuide && <CropGuide crop={crop} method={growth!.method} />}
              </>
            )}
          </View>
        )}

        {growth && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seeds</Text>
            <View style={styles.seedRow}>
              <Text style={styles.seedLabel}>Sown</Text>
              <Stepper
                label="Seeds sown"
                value={seedsSown ?? 1}
                onChange={(n) =>
                  props.onUpdateGrowth(item.id, {
                    ...growth,
                    seedsSown: n,
                    transplantedCount:
                      growth.transplantedCount === undefined ? undefined : Math.min(growth.transplantedCount, n),
                  })
                }
                max={999}
                suffix={seedsSown === 1 ? 'seed' : 'seeds'}
              />
            </View>
            {growth.method === 'transplant' && growth.transplantedAt && (
              <View style={styles.seedRow}>
                <Text style={styles.seedLabel}>Transplanted</Text>
                <Stepper
                  label="Seedlings transplanted"
                  value={growth.transplantedCount ?? seedsSown ?? 1}
                  onChange={(n) =>
                    props.onUpdateGrowth(item.id, { ...growth, seedsSown: seedsSown ?? 1, transplantedCount: n })
                  }
                  min={0}
                  max={seedsSown ?? 1}
                  suffix={`of ${seedsSown ?? 1}`}
                />
              </View>
            )}
            {success && (
              <Text style={styles.successLine}>
                🪴 {success.transplanted} of {success.sown} seeds made it to transplanting ({success.percent}%)
              </Text>
            )}
          </View>
        )}

        {item.kind === 'plant' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <PhotoLog
              photos={item.photos}
              sownAt={growth?.sownAt}
              onAdd={(uri) => props.onAddPhoto(item.id, uri)}
              onOpen={(p) => setView({ kind: 'photo', id: p.id })}
            />
          </View>
        )}

        <View style={styles.stats}>
          {stats.map((s) => (
            <View key={s.label} style={styles.stat}>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                {s.value}
              </Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {isPlant ? (
          <View style={styles.actionRow}>
            <Button label="💧  Watered now" color={colors.water} onPress={() => onWater(item.id)} />
          </View>
        ) : (
          <>
            <View style={styles.actionRow}>
              <Button label="🌾  Fed now" color={colors.plant} onPress={() => onFeed(item.id)} />
            </View>
            <View style={styles.eggRow}>
              <Stepper label="Eggs collected" value={eggCount} onChange={setEggCount} max={200} suffix="eggs" />
              <View style={styles.eggBtn}>
                <Button
                  label="Log"
                  color={colors.animal}
                  onPress={() => {
                    onLogEggs(item.id, eggCount);
                    setEggCount(1);
                  }}
                />
              </View>
            </View>
          </>
        )}

        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>History</Text>
          {history.some((h) => h.undoable) && (
            <Text style={styles.undo} onPress={() => onUndo(item.id)} accessibilityRole="button">
              Undo last
            </Text>
          )}
        </View>
        <View>
          {history.length === 0 ? (
            <Text style={styles.empty}>{isPlant ? 'No waterings logged yet.' : 'No feedings or eggs logged yet.'}</Text>
          ) : (
            history.map((h) => (
              <Text key={h.key} style={styles.historyItem}>
                {h.text}
              </Text>
            ))
          )}
        </View>
      </ScrollView>
    </Sheet>
  );
}

const STAGE_BUTTON: Record<StageAction, { label: string }> = {
  sprouted: { label: '🌱  It has sprouted' },
  transplanted: { label: '🪴  Mark as transplanted' },
  harvested: { label: '🧺  Mark as harvested' },
};

const styles = StyleSheet.create({
  body: { flexShrink: 1 },
  growth: { marginBottom: 20 },
  journeyHint: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 4 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 8 },
  seedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  seedLabel: { fontSize: 14, color: colors.text },
  successLine: { fontSize: 14, fontWeight: '600', color: colors.plant, marginTop: 4 },
  countBlock: { alignItems: 'center', marginTop: 16 },
  countLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  growthHeadline: { fontSize: 17, fontWeight: '700', marginTop: 16, textAlign: 'center' },
  guideToggle: { fontSize: 15, fontWeight: '600', color: colors.water, marginTop: 16, marginBottom: 8 },
  growthNote: { fontSize: 13, color: colors.muted, marginTop: 4, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: 8 },
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
  actionRow: { flexDirection: 'row', marginTop: 16 },
  eggRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 12 },
  eggBtn: { flex: 1, flexDirection: 'row' },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 8 },
  historyTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  undo: { fontSize: 14, color: colors.water, fontWeight: '600' },
  historyItem: {
    fontSize: 14,
    color: colors.text,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  empty: { fontSize: 14, color: colors.muted, paddingVertical: 8 },
});
