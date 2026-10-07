import * as DocumentPicker from 'expo-document-picker';

/** Shares the file where the browser supports it, otherwise downloads it. */
export async function shareTransferFile(name: string, text: string): Promise<void> {
  const file = new File([text], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'FarmHand plants' });
      return;
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Lets the user pick a received file and returns its text, or null if they cancelled. */
export async function pickTransferFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', '.json'] });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset?.file) return null;
  return asset.file.text();
}
