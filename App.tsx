import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddItemModal } from './src/components/AddItemModal';
import { HomeAssistantModal } from './src/components/HomeAssistantModal';
import { ItemCard } from './src/components/ItemCard';
import { ItemDetailModal } from './src/components/ItemDetailModal';
import { SectionKey, sections } from './src/sections';
import { colors, radius } from './src/theme';
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
    renameItem,
    setTags,
    setWaterEvery,
    waterPlant,
    logEggs,
    feedAnimal,
    advanceStage,
    updateGrowth,
    addPhoto,
    setPhotoDate,
    removePhoto,
    undoLast,
  } = useItems();
  const homeAssistant = useHomeAssistant(items, loaded);
  const [adding, setAdding] = useState(false);
  const [linking, setLinking] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
  const visible = bySection[sectionKey];

  const plantCount = items.filter((i) => i.kind === 'plant').length;
  const animalCount = items.length - plantCount;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title}>FarmHand</Text>
          <Text style={styles.subtitle}>
            {plantCount} plant{plantCount === 1 ? '' : 's'} · {animalCount} animal{animalCount === 1 ? '' : 's'}
          </Text>
        </View>
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
              onPress={() => setSelectedId(item.id)}
              onWater={() => waterPlant(item.id)}
              onFeed={() => feedAnimal(item.id)}
              onEgg={() => logEggs(item.id, 1)}
            />
          )}
          ListEmptyComponent={
            items.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🌱🐔</Text>
                <Text style={styles.emptyTitle}>Nothing tracked yet</Text>
                <Text style={styles.emptyText}>Tap “Add” below to start tracking a plant or your chickens.</Text>
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

      <View style={[styles.bottomBar, { paddingBottom: 12 + insets.bottom }]}>
        <Pressable
          onPress={() => setAdding(true)}
          style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.8 }]}
          accessibilityRole="button"
          accessibilityLabel="Add a plant or animal"
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
      />
      <AddItemModal visible={adding} onClose={() => setAdding(false)} onSave={addItem} />
      <ItemDetailModal
        item={selected}
        onClose={() => setSelectedId(null)}
        onWater={waterPlant}
        onLogEggs={logEggs}
        onFeed={feedAnimal}
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
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
