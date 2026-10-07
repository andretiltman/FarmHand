import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddItemModal } from './src/components/AddItemModal';
import { ItemCard } from './src/components/ItemCard';
import { ItemDetailModal } from './src/components/ItemDetailModal';
import { colors, radius } from './src/theme';
import { useItems } from './src/useItems';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <HomeScreen />
    </SafeAreaProvider>
  );
}

function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { items, loaded, addItem, removeItem, waterPlant, logEggs, feedAnimal, advanceStage, undoLast } =
    useItems();
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((i) => i.id === selectedId) ?? null;

  const plantCount = items.filter((i) => i.kind === 'plant').length;
  const animalCount = items.length - plantCount;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>FarmHand</Text>
        <Text style={styles.subtitle}>
          {plantCount} plant{plantCount === 1 ? '' : 's'} · {animalCount} animal{animalCount === 1 ? '' : 's'}
        </Text>
      </View>

      {!loaded ? (
        <ActivityIndicator style={styles.flex} color={colors.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={[styles.list, items.length === 0 && styles.flex]}
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
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🌱🐔</Text>
              <Text style={styles.emptyTitle}>Nothing tracked yet</Text>
              <Text style={styles.emptyText}>Tap “Add” below to start tracking a plant or your chickens.</Text>
            </View>
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
          <Text style={styles.addText}>＋  Add</Text>
        </Pressable>
      </View>

      <AddItemModal visible={adding} onClose={() => setAdding(false)} onSave={addItem} />
      <ItemDetailModal
        item={selected}
        onClose={() => setSelectedId(null)}
        onWater={waterPlant}
        onLogEggs={logEggs}
        onFeed={feedAnimal}
        onAdvance={advanceStage}
        onUndo={undoLast}
        onDelete={removeItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flexGrow: 1 },
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 30, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 2 },
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
