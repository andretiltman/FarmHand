import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddItemModal } from './src/components/AddItemModal';
import { HomeAssistantModal } from './src/components/HomeAssistantModal';
import { ItemCard } from './src/components/ItemCard';
import { ItemDetailModal } from './src/components/ItemDetailModal';
import { TransferModal } from './src/components/TransferModal';
import { SectionKey, sections } from './src/sections';
import { colors, radius } from './src/theme';
import { CareKind } from './src/types';
import { useHomeAssistant } from './src/useHomeAssistant';
import { useItems } from './src/useItems';

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
    importPlants,
    applySnapshot,
    itemsRef,
    deletedRef,
    renameItem,
    setTags,
    setWaterEvery,
    waterPlant,
    logEggs,
    logCare,
    setCare,
    setCareEvery,
    setNames,
    completeTask,
    setTaskEvery,
    advanceStage,
    updateGrowth,
    addPhoto,
    setPhotoDate,
    removePhoto,
    undoLast,
  } = useItems();
  const homeAssistant = useHomeAssistant(items, loaded, { itemsRef, deletedRef, applySnapshot });
  const [adding, setAdding] = useState(false);
  const [linking, setLinking] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Set when a card's care button opens the details popup to pick which named animals it was for. */
  const [startCare, setStartCare] = useState<CareKind | null>(null);
  const [sectionKey, setSectionKey] = useState<SectionKey>('overview');
  const selected = items.find((i) => i.id === selectedId) ?? null;

  const bySection = useMemo(() => {
    const now = new Date();
    return Object.fromEntries(sections.map((s) => [s.key, items.filter((i) => s.includes(i, now))])) as Record<
      SectionKey,
      typeof items
    >;
  }, [items]);
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

  const plantCount = items.filter((i) => i.kind === 'plant').length;
  const animalCount = items.filter((i) => i.kind === 'animal').length;
  const taskCount = items.filter((i) => i.kind === 'task').length;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title}>FarmHand</Text>
          <Text style={styles.subtitle}>
            {plantCount} plant{plantCount === 1 ? '' : 's'} · {animalCount} animal{animalCount === 1 ? '' : 's'}
            {taskCount > 0 ? ` · ${taskCount} task${taskCount === 1 ? '' : 's'}` : ''}
          </Text>
        </View>
        <Pressable
          onPress={() => setTransferring(true)}
          hitSlop={8}
          style={({ pressed }) => [styles.haButton, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Send or receive plants"
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
          data={visible}
          keyExtractor={(i) => i.id}
          contentContainerStyle={[styles.list, visible.length === 0 && styles.flex]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              onPress={() => {
                setStartCare(null);
                setSelectedId(item.id);
              }}
              onWater={() => waterPlant(item.id)}
              onCare={(kind) => {
                if (item.kind === 'animal' && item.names.length > 1) {
                  setStartCare(kind);
                  setSelectedId(item.id);
                } else logCare(item.id, kind);
              }}
              onEgg={() => logEggs(item.id, 1)}
              onDone={() => completeTask(item.id)}
            />
          )}
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
          accessibilityLabel="Add a plant, animal or maintenance task"
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
        onClose={() => setTransferring(false)}
        items={items}
        onImport={importPlants}
        onRemove={removeItems}
        onUpdateGrowth={updateGrowth}
        deletedRef={deletedRef}
        onSync={applySnapshot}
      />
      <AddItemModal visible={adding} onClose={() => setAdding(false)} onSave={addItem} />
      <ItemDetailModal
        item={selected}
        onClose={() => {
          setSelectedId(null);
          setStartCare(null);
        }}
        startCare={startCare}
        onSetNames={setNames}
        onWater={waterPlant}
        onLogEggs={logEggs}
        onCare={logCare}
        onSetCare={setCare}
        onSetCareEvery={setCareEvery}
        onCompleteTask={completeTask}
        onSetTaskEvery={setTaskEvery}
        onAdvance={advanceStage}
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
