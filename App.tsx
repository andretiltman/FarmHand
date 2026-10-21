import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { asksWho } from './src/care';
import { AddItemModal } from './src/components/AddItemModal';
import { HomeAssistantModal } from './src/components/HomeAssistantModal';
import { ItemCard } from './src/components/ItemCard';
import { ItemDetailModal } from './src/components/ItemDetailModal';
import { LotDetailModal } from './src/components/LotDetailModal';
import { LotFeedModal } from './src/components/LotFeedModal';
import { SeedsModal } from './src/components/SeedsModal';
import { TransferModal } from './src/components/TransferModal';
import { groupByLot, lotEmoji, lotKey, lotNames, plantsInLot } from './src/lots';
import { readyInputs } from './src/natural';
import { overviewGroups, SectionKey, sections } from './src/sections';
import { plantSummary } from './src/stats';
import { colors, radius } from './src/theme';
import { CareKind, TrackedItem } from './src/types';
import { useHomeAssistant } from './src/useHomeAssistant';
import { useItems } from './src/useItems';
import { useLots } from './src/useLots';
import { useSeeds } from './src/useSeeds';

/**
 * A row on the list: an item, (on the overview) a group heading with how many need doing, or a lot heading over
 * the plants in it, with buttons to water or feed the whole lot.
 */
type Row =
  | { type: 'item'; item: TrackedItem }
  | { type: 'group'; key: SectionKey; emoji: string; label: string; count: number; open: boolean }
  | { type: 'lot'; key: string; lot: string | null; count: number };

/** Item rows, under a heading per lot when any of the plants are in one. `key` keeps headings unique per group. */
function itemRows(list: TrackedItem[], key: string): Row[] {
  const byLot = groupByLot(list);
  if (!byLot) return list.map((item) => ({ type: 'item', item }));
  return [
    ...byLot.groups.flatMap((g): Row[] => [
      { type: 'lot', key: `lot-${key}-${g.lot ? lotKey(g.lot) : ''}`, lot: g.lot, count: g.items.length },
      ...g.items.map((item): Row => ({ type: 'item', item })),
    ]),
    ...byLot.others.map((item): Row => ({ type: 'item', item })),
  ];
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationBar hidden />
      <HomeScreen />
    </SafeAreaProvider>
  );
}

function HomeScreen() {
  const insets = useSafeAreaInsets();
  const {
    items,
    loaded,
    addItem,
    removeItem,
    removeItems,
    importItems,
    applySnapshot,
    itemsRef,
    deletedRef,
    renameItem,
    setTags,
    setWaterEvery,
    waterPlant,
    waterPlants,
    logEggs,
    logCare,
    setFeed,
    setCare,
    setCareEvery,
    setNames,
    keepAnimals,
    completeTask,
    setTaskEvery,
    setTaskSchedule,
    giveInputs,
    giveInputsTo,
    setLot,
    renameLot,
    transplant,
    setFlowered,
    advanceBatch,
    setUsedUp,
    advanceStage,
    updateGrowth,
    addPhoto,
    setPhotoDate,
    removePhoto,
    undoLast,
  } = useItems();
  const seeds = useSeeds();
  const lotInfo = useLots();
  const homeAssistant = useHomeAssistant(items, loaded, { itemsRef, deletedRef, applySnapshot });
  const [adding, setAdding] = useState(false);
  const [linking, setLinking] = useState(false);
  const [stocking, setStocking] = useState(false);
  const [transferring, setTransferring] = useState(false);
  /** Set when a seed packet's Send button opens the transfer popup on "Send" with it ticked. */
  const [sendPacketId, setSendPacketId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Set when a card's care button opens the details popup to pick which named animals it was for. */
  const [startCare, setStartCare] = useState<CareKind | null>(null);
  /** Set when a plant card's Feed button opens the details popup to pick which natural inputs were given. */
  const [startFeed, setStartFeed] = useState(false);
  /** Set when a lot heading's Feed button opens the popup to pick what was given to the whole lot. */
  const [feedingLot, setFeedingLot] = useState<string | null>(null);
  /** Set when a lot heading is tapped, to show the lot's details. */
  const [viewingLot, setViewingLot] = useState<string | null>(null);
  const [sectionKey, setSectionKey] = useState<SectionKey>('overview');
  /** Overview groups that are opened up to show their items (they start closed, showing just a count). */
  const [openGroups, setOpenGroups] = useState<SectionKey[]>([]);
  const selected = items.find((i) => i.id === selectedId) ?? null;

  /** Natural inputs with a batch ready to use – plants are only reminded about these. */
  const ready = useMemo(() => readyInputs(items), [items]);
  const lots = useMemo(() => lotNames(items), [items]);
  const bySection = useMemo(() => {
    const now = new Date();
    return Object.fromEntries(sections.map((s) => [s.key, items.filter((i) => s.includes(i, now, ready))])) as Record<
      SectionKey,
      typeof items
    >;
  }, [items, ready]);
  const section = sections.find((s) => s.key === sectionKey)!;

  // Swipe left/right on the list to move to the next/previous section.
  const sectionIndexRef = useRef(0);
  sectionIndexRef.current = sections.indexOf(section);
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) < 60 && Math.abs(g.vx) < 0.5) return;
          const next = sectionIndexRef.current + (g.dx < 0 ? 1 : -1);
          if (next >= 0 && next < sections.length) setSectionKey(sections[next].key);
        },
      }),
    [],
  );

  // Keep the selected chip in view when the section changes (e.g. after a swipe).
  const tabsRef = useRef<ScrollView>(null);
  const tabX = useRef<Partial<Record<SectionKey, number>>>({});
  useEffect(() => {
    const x = tabX.current[sectionKey];
    if (x !== undefined) tabsRef.current?.scrollTo({ x: Math.max(0, x - 40), animated: true });
  }, [sectionKey]);
  const visible = bySection[sectionKey];

  // The overview lists a row per group – e.g. "🌰 Seeds 3" – that opens up to show what needs doing.
  const rows: Row[] = useMemo(() => {
    if (sectionKey !== 'overview') return itemRows(visible, sectionKey);
    const now = new Date();
    return overviewGroups.flatMap((g): Row[] => {
      const groupItems = visible.filter((i) => g.includes(i, now, ready));
      if (!groupItems.length) return [];
      const open = openGroups.includes(g.key);
      const header: Row = { type: 'group', key: g.key, emoji: g.emoji, label: g.label, count: groupItems.length, open };
      return open ? [header, ...itemRows(groupItems, g.key)] : [header];
    });
  }, [sectionKey, visible, openGroups, ready]);
  const toggleGroup = (key: SectionKey) =>
    setOpenGroups((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const plantCount = items.filter((i) => i.kind === 'plant').length;
  const animalCount = items.filter((i) => i.kind === 'animal').length;
  const taskCount = items.filter((i) => i.kind === 'task').length;
  const batchCount = items.filter((i) => i.kind === 'input').length;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title}>FarmHand</Text>
          <Text style={styles.subtitle}>
            {plantCount} plant{plantCount === 1 ? '' : 's'} · {animalCount} animal{animalCount === 1 ? '' : 's'}
            {taskCount > 0 ? ` · ${taskCount} task${taskCount === 1 ? '' : 's'}` : ''}
            {batchCount > 0 ? ` · ${batchCount} batch${batchCount === 1 ? '' : 'es'}` : ''}
          </Text>
        </View>
        <Pressable
          onPress={() => setTransferring(true)}
          hitSlop={8}
          style={({ pressed }) => [styles.haButton, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Send or receive plants, animals, tasks and seeds"
        >
          <Text style={styles.haIcon}>📤</Text>
        </Pressable>
        <Pressable
          onPress={() => setLinking(true)}
          hitSlop={8}
          style={({ pressed }) => [styles.haButton, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Home Assistant settings"
        >
          <Text style={styles.haIcon}>🏠</Text>
          {homeAssistant.config ? (
            <View style={[styles.haDot, homeAssistant.status.error ? styles.haDotError : null]} />
          ) : null}
        </Pressable>
      </View>

      <ScrollView
        ref={tabsRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabs}
      >
        {sections.map((s) => {
          const on = s.key === sectionKey;
          const count = bySection[s.key].length;
          return (
            <Pressable
              key={s.key}
              onPress={() => setSectionKey(s.key)}
              onLayout={(e) => (tabX.current[s.key] = e.nativeEvent.layout.x)}
              style={({ pressed }) => [styles.tab, on && styles.tabOn, pressed && { opacity: 0.7 }]}
              accessibilityRole="tab"
              aria-selected={on}
              accessibilityLabel={`${s.label}, ${count}`}
            >
              <Text style={[styles.tabText, on && styles.tabTextOn]}>
                {s.emoji} {s.label}
              </Text>
              {count > 0 ? (
                <View
                  style={[
                    styles.badge,
                    s.key === 'overview' && !on && styles.badgeAlert,
                    on && styles.badgeOn,
                  ]}
                >
                  <Text style={[styles.badgeText, (on || s.key === 'overview') && styles.badgeTextOn]}>
                    {count}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.content} {...swipe.panHandlers}>
      {!loaded ? (
        <ActivityIndicator style={styles.flex} color={colors.primary} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => (r.type === 'group' ? `group-${r.key}` : r.type === 'lot' ? r.key : r.item.id)}
          contentContainerStyle={[styles.list, rows.length === 0 && styles.flex]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item: row }) => {
            if (row.type === 'group') {
              return (
                <Pressable
                  onPress={() => toggleGroup(row.key)}
                  style={({ pressed }) => [styles.group, pressed && { opacity: 0.7 }]}
                  accessibilityRole="button"
                  aria-expanded={row.open}
                  accessibilityLabel={`${row.label}, ${row.count} to do`}
                >
                  <Text style={styles.groupEmoji}>{row.emoji}</Text>
                  <Text style={styles.groupLabel}>{row.label}</Text>
                  <View style={[styles.badge, styles.badgeAlert]}>
                    <Text style={[styles.badgeText, styles.badgeTextOn]}>{row.count}</Text>
                  </View>
                  <Text style={styles.groupChevron}>{row.open ? '▾' : '▸'}</Text>
                </Pressable>
              );
            }
            if (row.type === 'lot') {
              if (!row.lot) {
                return (
                  <View style={styles.lot}>
                    <Text style={styles.lotName}>Not in a lot</Text>
                  </View>
                );
              }
              const lot = row.lot;
              // The buttons look after the whole lot – also its plants that aren't in this section.
              const inLot = plantsInLot(items, lot);
              const due = inLot.filter((p) => plantSummary(p).status !== 'ok').length;
              const plants = `${inLot.length} plant${inLot.length === 1 ? '' : 's'}`;
              const lotPhoto = lotInfo.photosOf(lot)[0];
              return (
                <View style={styles.lot}>
                  <Pressable
                    onPress={() => setViewingLot(lot)}
                    hitSlop={4}
                    style={({ pressed }) => [styles.lotInfo, pressed && { opacity: 0.6 }]}
                    accessibilityRole="button"
                    accessibilityLabel={`${lot}, ${plants}. Show lot details`}
                  >
                    {lotPhoto && <Image source={{ uri: lotPhoto.uri }} style={styles.lotPhoto} />}
                    <View style={styles.flexShrink}>
                      <Text style={styles.lotName} numberOfLines={1}>
                        {lotPhoto ? '' : `${lotEmoji(lot)} `}
                        {lot} <Text style={styles.lotChevron}>›</Text>
                      </Text>
                      <Text style={[styles.lotSub, due > 0 && { color: colors.warning }]} numberOfLines={1}>
                        {inLot.length ? plants : 'Nothing growing'}
                        {due > 0 ? ` · 💧 ${due} due` : ''}
                      </Text>
                    </View>
                  </Pressable>
                  {inLot.length > 0 && (
                  <>
                  <Pressable
                    onPress={() => waterPlants(inLot.map((p) => p.id))}
                    hitSlop={4}
                    style={({ pressed }) => [styles.lotAction, { backgroundColor: colors.waterSoft }, pressed && { opacity: 0.7 }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Log watering for all ${plants} in ${lot}`}
                  >
                    <Text style={[styles.lotActionText, { color: colors.water }]}>💧 Water lot</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setFeedingLot(lot)}
                    hitSlop={4}
                    style={({ pressed }) => [styles.lotAction, { backgroundColor: colors.inputSoft }, pressed && { opacity: 0.7 }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Give natural inputs to all ${plants} in ${lot}`}
                  >
                    <Text style={[styles.lotActionText, { color: colors.input }]}>🧪 Feed lot</Text>
                  </Pressable>
                  </>
                  )}
                </View>
              );
            }
            const { item } = row;
            return (
              <ItemCard
                item={item}
                ready={ready}
                onPress={() => {
                  setStartCare(null);
                  setStartFeed(false);
                  setSelectedId(item.id);
                }}
                onWater={() => waterPlant(item.id)}
                onFeed={() => {
                  setStartCare(null);
                  setStartFeed(true);
                  setSelectedId(item.id);
                }}
                onStep={() => advanceBatch(item.id)}
                onCare={(kind) => {
                  if (item.kind === 'animal' && asksWho(item, kind)) {
                    setStartFeed(false);
                    setStartCare(kind);
                    setSelectedId(item.id);
                  } else logCare(item.id, kind);
                }}
                onEgg={() => logEggs(item.id, 1)}
                onDone={() => completeTask(item.id)}
              />
            );
          }}
          ListEmptyComponent={
            items.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🌱🐔</Text>
                <Text style={styles.emptyTitle}>Nothing tracked yet</Text>
                <Text style={styles.emptyText}>Tap “Add” below to start tracking a plant, your chickens or a maintenance job.</Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>{sectionKey === 'overview' ? '✅' : section.emoji}</Text>
                <Text style={styles.emptyTitle}>{section.emptyTitle}</Text>
                <Text style={styles.emptyText}>{section.emptyText}</Text>
              </View>
            )
          }
        />
      )}
      </View>

      <View style={[styles.bottomBar, { paddingBottom: 12 + insets.bottom }]}>
        <Pressable
          onPress={() => setAdding(true)}
          style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.8 }]}
          accessibilityRole="button"
          accessibilityLabel="Add a plant, animal, maintenance task, natural input or seeds"
        >
          <Text style={styles.addText}>＋ Add</Text>
        </Pressable>
      </View>

      <HomeAssistantModal
        visible={linking}
        onClose={() => setLinking(false)}
        items={items}
        config={homeAssistant.config}
        status={homeAssistant.status}
        onConnect={homeAssistant.connect}
        onDisconnect={homeAssistant.disconnect}
        onSyncNow={homeAssistant.syncNow}
        sharing={homeAssistant.sharing}
        onSetShare={homeAssistant.setShare}
      />
      <TransferModal
        visible={transferring}
        onClose={() => {
          setTransferring(false);
          setSendPacketId(null);
        }}
        items={items}
        onImport={importItems}
        onRemove={removeItems}
        onUpdateGrowth={updateGrowth}
        onKeepAnimals={keepAnimals}
        deletedRef={deletedRef}
        onSync={applySnapshot}
        seeds={seeds.packets}
        onImportSeeds={seeds.importSeeds}
        onTakeSeeds={seeds.takeSeeds}
        sendPacketId={sendPacketId}
      />
      <SeedsModal
        visible={stocking}
        onClose={() => setStocking(false)}
        packets={seeds.packets}
        onAdd={seeds.addSeeds}
        onSetCount={seeds.setSeedCount}
        onRemove={seeds.removePacket}
        onAddPhoto={seeds.addSeedPhoto}
        onSetPhotoDate={seeds.setSeedPhotoDate}
        onRemovePhoto={seeds.removeSeedPhoto}
        onSend={(id) => {
          setStocking(false);
          setSendPacketId(id);
          setTransferring(true);
        }}
      />
      <LotDetailModal
        lot={viewingLot}
        items={items}
        photos={viewingLot ? lotInfo.photosOf(viewingLot) : []}
        onClose={() => setViewingLot(null)}
        onOpenPlant={(id) => {
          setViewingLot(null);
          setStartCare(null);
          setStartFeed(false);
          setSelectedId(id);
        }}
        onWater={waterPlants}
        onFeed={() => {
          setFeedingLot(viewingLot);
          setViewingLot(null);
        }}
        onRename={(from, to) => {
          renameLot(from, to);
          lotInfo.renameLotInfo(from, to);
          setViewingLot(lots.find((l) => lotKey(l) === lotKey(to)) ?? to.trim());
        }}
        onAddPhoto={(uri) => lotInfo.addLotPhoto(viewingLot!, uri)}
        onSetPhotoDate={(photoId, takenAt) => lotInfo.setLotPhotoDate(viewingLot!, photoId, takenAt)}
        onRemovePhoto={(photoId) => lotInfo.removeLotPhoto(viewingLot!, photoId)}
      />
      <LotFeedModal
        lot={feedingLot}
        plants={feedingLot ? plantsInLot(items, feedingLot) : []}
        batches={items.filter((i) => i.kind === 'input')}
        ready={ready}
        onGive={giveInputsTo}
        onClose={() => setFeedingLot(null)}
      />
      <AddItemModal
        visible={adding}
        lots={lots}
        onClose={() => setAdding(false)}
        onSave={addItem}
        seeds={seeds.packets}
        onTakeSeeds={seeds.takeSeeds}
        onAddSeeds={() => {
          setAdding(false);
          setStocking(true);
        }}
      />
      <ItemDetailModal
        item={selected}
        onClose={() => {
          setSelectedId(null);
          setStartCare(null);
          setStartFeed(false);
        }}
        startCare={startCare}
        startFeed={startFeed}
        batches={items.filter((i) => i.kind === 'input')}
        ready={ready}
        onGiveInputs={giveInputs}
        onSetFlowered={setFlowered}
        onAdvanceBatch={advanceBatch}
        onSetUsedUp={setUsedUp}
        onSetNames={setNames}
        onWater={waterPlant}
        onLogEggs={logEggs}
        onCare={logCare}
        onSetFeed={setFeed}
        onSetCare={setCare}
        onSetCareEvery={setCareEvery}
        onCompleteTask={completeTask}
        onSetTaskEvery={setTaskEvery}
        onSetTaskSchedule={setTaskSchedule}
        onAdvance={advanceStage}
        onTransplant={transplant}
        lots={lots}
        onSetLot={setLot}
        onUpdateGrowth={updateGrowth}
        onAddPhoto={addPhoto}
        onSetPhotoDate={setPhotoDate}
        onRemovePhoto={removePhoto}
        onUndo={undoLast}
        onRename={renameItem}
        onSetTags={setTags}
        onSetWaterEvery={setWaterEvery}
        onDelete={removeItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flexGrow: 1 },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  haButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  haIcon: { fontSize: 20 },
  haDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.plant,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  haDotError: { backgroundColor: colors.danger },
  title: { fontSize: 30, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 2 },
  tabsScroll: { flexGrow: 0 },
  tabs: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 15, fontWeight: '600', color: colors.text },
  tabTextOn: { color: colors.primaryText },
  badge: {
    marginLeft: 6,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  badgeAlert: { backgroundColor: colors.warning },
  badgeOn: { backgroundColor: 'rgba(255,255,255,0.25)' },
  badgeText: { fontSize: 12, fontWeight: '700', color: colors.muted },
  badgeTextOn: { color: colors.primaryText },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupEmoji: { fontSize: 22, marginRight: 10 },
  groupLabel: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text },
  lot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  flexShrink: { flex: 1, minWidth: 0 },
  lotInfo: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  lotPhoto: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface },
  lotChevron: { color: colors.muted, fontWeight: '600' },
  lotName: { fontSize: 15, fontWeight: '800', color: colors.text },
  lotSub: { fontSize: 12, fontWeight: '600', color: colors.muted, marginTop: 1 },
  lotAction: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm },
  lotActionText: { fontSize: 13, fontWeight: '700' },
  groupChevron: { fontSize: 16, color: colors.muted, marginLeft: 12, width: 14, textAlign: 'center' },
  separator: { height: 10 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 12 },
  emptyText: { fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 6 },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { color: colors.primaryText, fontSize: 18, fontWeight: '700' },
});
