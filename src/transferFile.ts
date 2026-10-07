import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Writes the file and opens the share sheet (WhatsApp, email, Bluetooth, Nearby Share, AirDrop, …). */
export async function shareTransferFile(name: string, text: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing isn't available on this device.");
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.write(text);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Send plants' });
}

/** Lets the user pick a received file and returns its text, or null if they cancelled. */
export async function pickTransferFile(): Promise<string | null> {
  // Apps like WhatsApp often save the file without a JSON type, so allow any file and check its contents.
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (result.canceled || !result.assets[0]) return null;
  const file = new File(result.assets[0].uri);
  try {
    return await file.text();
  } finally {
    if (file.exists) file.delete();
  }
}
