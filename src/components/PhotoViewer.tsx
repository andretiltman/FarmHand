import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { formatDateTime } from '../dates';
import { colors, radius } from '../theme';
import { PlantPhoto } from '../types';
import { Button } from './Button';
import { Calendar } from './Calendar';
import { photoLabel } from './PhotoLog';

interface Props {
  photo: PlantPhoto;
  sownAt?: string;
  onClose: () => void;
  onChangeDate: (takenAt: string) => void;
  onDelete: () => void;
}

/** One photo, large, with its date (changeable, e.g. for older photos from the library) and delete. */
export function PhotoViewer({ photo, sownAt, onClose, onChangeDate, onDelete }: Props) {
  const [mode, setMode] = useState<'view' | 'date' | 'delete'>('view');
  const [date, setDate] = useState(() => new Date(photo.takenAt));

  if (mode === 'date') {
    return (
      <View>
        <Text style={styles.question}>When was this photo taken?</Text>
        <View style={styles.calendar}>
          <Calendar value={date} onChange={setDate} min={sownAt ? new Date(sownAt) : undefined} max={new Date()} />
        </View>
        <View style={styles.buttons}>
          <Button label="Cancel" variant="secondary" onPress={() => setMode('view')} />
          <Button
            label="Save"
            onPress={() => {
              const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
              onChangeDate(at.toISOString());
              setMode('view');
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View>
      <Image source={{ uri: photo.uri }} style={styles.image} resizeMode="contain" accessibilityLabel="Photo" />
      <Text style={styles.caption}>
        {sownAt ? `${photoLabel(photo, sownAt)} · ` : ''}
        {formatDateTime(photo.takenAt)}
      </Text>
      <Text style={styles.link} onPress={() => setMode('date')} accessibilityRole="button">
        📅 Change date
      </Text>
      <View style={styles.buttons}>
        {mode === 'delete' ? (
          <>
            <Button label="Keep" variant="secondary" onPress={() => setMode('view')} />
            <Button label="Yes, delete" variant="danger" onPress={onDelete} />
          </>
        ) : (
          <>
            <Button label="Back" variant="secondary" onPress={onClose} />
            <Button label="Delete photo" variant="danger" onPress={() => setMode('delete')} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: 340, borderRadius: radius.md, backgroundColor: colors.background },
  caption: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 10, textAlign: 'center' },
  link: { fontSize: 14, fontWeight: '600', color: colors.water, marginTop: 8, textAlign: 'center' },
  question: { fontSize: 18, fontWeight: '700', color: colors.text },
  calendar: { marginTop: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 8 },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 16 },
});
