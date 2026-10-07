import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { daysBetween, formatShortDate } from '../dates';
import { colors, radius } from '../theme';
import { PlantPhoto } from '../types';

interface Props {
  photos: PlantPhoto[];
  /** When the plant was sown, to label photos "Day 23". */
  sownAt?: string;
  onAdd: (pickedUri: string) => Promise<void>;
  onOpen: (photo: PlantPhoto) => void;
}

export function photoLabel(photo: PlantPhoto, sownAt?: string): string {
  const date = new Date(photo.takenAt);
  if (!sownAt) return formatShortDate(date);
  return `Day ${Math.max(0, daysBetween(new Date(sownAt), date))}`;
}

/** Progress photos for a plant: a row of thumbnails plus camera / library buttons. */
export function PhotoLog({ photos, sownAt, onAdd, onOpen }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (source: 'camera' | 'library') => {
    setError(null);
    try {
      if (source === 'camera' && Platform.OS !== 'web') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setError('Camera access is needed to take photos. You can allow it in your phone settings.');
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets[0]) return;
      setBusy(true);
      await onAdd(result.assets[0].uri);
    } catch (e) {
      console.warn('Failed to add photo', e);
      setError("Couldn't add that photo – please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      {photos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {photos.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => onOpen(p)}
              style={({ pressed }) => [styles.thumbWrap, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Photo, ${photoLabel(p, sownAt)}, ${formatShortDate(new Date(p.takenAt))}`}
            >
              <Image source={{ uri: p.uri }} style={styles.thumb} />
              <Text style={styles.thumbLabel}>{photoLabel(p, sownAt)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.empty}>No photos yet – add one to watch it grow.</Text>
      )}
      <View style={styles.buttons}>
        <PhotoButton label="📷  Take photo" onPress={() => pick('camera')} disabled={busy} />
        <PhotoButton label="🖼️  Choose photo" onPress={() => pick('library')} disabled={busy} />
      </View>
      {busy && <ActivityIndicator style={styles.busy} color={colors.plant} />}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

function PhotoButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.button, (pressed || disabled) && styles.pressed]}
      accessibilityRole="button"
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const THUMB = 92;

const styles = StyleSheet.create({
  strip: { gap: 10, paddingBottom: 4 },
  thumbWrap: { alignItems: 'center' },
  pressed: { opacity: 0.6 },
  thumb: { width: THUMB, height: THUMB, borderRadius: radius.sm, backgroundColor: colors.background },
  thumbLabel: { fontSize: 12, color: colors.muted, marginTop: 4, fontWeight: '600' },
  empty: { fontSize: 14, color: colors.muted },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 10 },
  button: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  buttonText: { fontSize: 14, fontWeight: '600', color: colors.text },
  busy: { marginTop: 8 },
  error: { fontSize: 13, color: colors.danger, marginTop: 8 },
});
