import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatDateTime } from '../dates';
import { buildSensors, HAConfig } from '../homeAssistant';
import { colors, radius } from '../theme';
import { TrackedItem } from '../types';
import { HAStatus } from '../useHomeAssistant';
import { Button } from './Button';
import { Sheet } from './Sheet';

interface Props {
  visible: boolean;
  onClose: () => void;
  items: TrackedItem[];
  config: HAConfig | null;
  status: HAStatus;
  onConnect: (config: HAConfig) => Promise<void>;
  onDisconnect: () => void;
  onSyncNow: () => void;
}

/** Link FarmHand to Home Assistant so each plant, animal and maintenance task shows up there as a sensor. */
export function HomeAssistantModal({ visible, onClose, items, config, status, onConnect, onDisconnect, onSyncNow }: Props) {
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setUrl(config?.url ?? '');
      setToken('');
      setError(null);
    }
  }, [visible, config]);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConnect({ url: url.trim(), token: token.trim() });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const sensors = buildSensors(items);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      subtitle="Settings"
      title="Home Assistant"
      footer={
        config ? (
          <>
            <Button label="Disconnect" variant="danger" onPress={onDisconnect} />
            <Button label={status.syncing ? 'Syncing…' : 'Sync now'} onPress={onSyncNow} disabled={status.syncing} />
          </>
        ) : (
          <Button
            label={busy ? 'Connecting…' : 'Connect'}
            onPress={connect}
            disabled={busy || !url.trim() || !token.trim()}
          />
        )
      }
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        {config ? (
          <>
            <View style={styles.statusBox}>
              <Text style={styles.statusTitle}>✅ Connected to {config.url}</Text>
              <Text style={[styles.statusText, status.error && styles.error]}>
                {status.error
                  ? `⚠️ ${status.error}`
                  : status.lastSync
                    ? `Last synced ${formatDateTime(status.lastSync)}`
                    : 'Not synced yet'}
              </Text>
            </View>
            <Text style={styles.help}>
              Sensors update whenever you change something, and every 15 minutes while FarmHand is open.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.help}>
              Each plant, animal and maintenance task will appear in Home Assistant as a sensor you can put on a dashboard or use in
              automations.
            </Text>
            <Text style={styles.label}>Home Assistant address</Text>
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="http://192.168.1.10:8123"
              placeholderTextColor={colors.muted}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Text style={styles.label}>Long-lived access token</Text>
            <TextInput
              value={token}
              onChangeText={setToken}
              placeholder="Paste your token"
              placeholderTextColor={colors.muted}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <Text style={styles.hint}>
              In Home Assistant, open your profile → Security → Long-lived access tokens → Create token.
            </Text>
            {Platform.OS === 'web' ? (
              <Text style={styles.hint}>
                On the web, add this page's address to cors_allowed_origins under http: in Home Assistant's
                configuration.yaml.
              </Text>
            ) : null}
            {error ? <Text style={[styles.statusText, styles.error, styles.spaced]}>⚠️ {error}</Text> : null}
          </>
        )}

        <Text style={styles.label}>Sensors</Text>
        {sensors.map((s) => (
          <View key={s.entityId} style={styles.sensor}>
            <Text style={styles.entity} numberOfLines={1}>
              {s.entityId}
            </Text>
            <Text style={styles.state} numberOfLines={1}>
              {String(s.state)}
              {s.attributes.unit_of_measurement ? ` ${s.attributes.unit_of_measurement}` : ''}
            </Text>
          </View>
        ))}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  help: { fontSize: 14, color: colors.text, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8, marginTop: 18 },
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
  hint: { fontSize: 13, color: colors.muted, marginTop: 8 },
  statusBox: { backgroundColor: colors.plantSoft, borderRadius: radius.sm, padding: 12, marginBottom: 12 },
  statusTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  statusText: { fontSize: 13, color: colors.muted, marginTop: 4 },
  error: { color: colors.danger },
  spaced: { marginTop: 12 },
  sensor: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  entity: { flex: 1, fontSize: 13, color: colors.text, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
  state: { fontSize: 13, fontWeight: '600', color: colors.plant },
});
