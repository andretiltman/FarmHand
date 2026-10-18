import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { lotEmoji } from '../lots';
import { colors } from '../theme';
import { InputItem, PlantItem } from '../types';
import { Button } from './Button';
import { InputPicker, inputChoices, inputsToTick } from './NaturalInputs';
import { Sheet } from './Sheet';

interface Props {
  /** The lot being fed; null when closed. */
  lot: string | null;
  /** The plants growing in it (see plantsInLot). */
  plants: PlantItem[];
  batches: InputItem[];
  ready: Set<string>;
  onGive: (ids: string[], given: string[]) => void;
  onClose: () => void;
}

/** Tick the natural inputs given to a whole lot (or the greenhouse) at once; each plant gets the feed in its history. */
export function LotFeedModal({ lot, plants, batches, ready, onGive, onClose }: Props) {
  const [given, setGiven] = useState<string[]>([]);

  useEffect(() => {
    if (lot) setGiven(inputsToTick(plants, ready));
  }, [lot]);

  if (!lot) return null;
  const n = plants.length;
  return (
    <Sheet
      visible
      onClose={onClose}
      subtitle={`Whole lot · ${n} plant${n === 1 ? '' : 's'}`}
      title={`${lotEmoji(lot)}  ${lot}`}
      footer={
        <>
          <Button label="Cancel" variant="secondary" onPress={onClose} />
          <Button
            label="🧪  Given"
            color={colors.input}
            disabled={given.length === 0 || n === 0}
            onPress={() => {
              onGive(
                plants.map((p) => p.id),
                given,
              );
              onClose();
            }}
          />
        </>
      }
    >
      <ScrollView style={styles.body}>
        <Text style={styles.sectionTitle}>What did you give the whole lot?</Text>
        <Text style={styles.plants}>{plants.map((p) => p.name).join(', ')}</Text>
        <InputPicker
          plants={plants}
          choices={inputChoices(plants, batches, ready)}
          ready={ready}
          given={given}
          onChange={setGiven}
        />
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { flexShrink: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  plants: { fontSize: 13, color: colors.muted, marginBottom: 8 },
});
