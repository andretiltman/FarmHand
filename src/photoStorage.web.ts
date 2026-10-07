// On the web the picker returns a temporary blob: URL, so store a downscaled JPEG data URL
// instead (browser storage is small – a few MB in total).
const MAX_SIDE = 800;

export async function savePhoto(pickedUri: string, _id: string): Promise<string> {
  const img = new Image();
  img.src = pickedUri;
  await img.decode();
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.7);
}

export function deletePhoto(_uri: string): void {
  // Nothing to clean up – the data lives inside the saved item.
}
