import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Writes bytes or text to the cache directory and opens the system share sheet (Save to Files, Drive, email…). */
export async function saveAndShare(name: string, content: Uint8Array | string, mimeType: string) {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: name });
  return file.uri;
}
