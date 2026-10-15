import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const KEY = 'nasrda-attendance-device-token';
let cached: string | null = null;

/** Stable random token that binds this phone to the account (the server stores only its hash). */
export async function deviceToken(): Promise<string> {
  if (cached) return cached;
  try {
    const saved = await SecureStore.getItemAsync(KEY);
    if (saved && saved.length >= 32) return (cached = saved);
  } catch { /* fall through and create a new one */ }
  const value = Crypto.randomUUID() + Crypto.randomUUID();
  await SecureStore.setItemAsync(KEY, value).catch(() => {});
  return (cached = value);
}

export const deviceLabel = () => (Device.modelName || Device.deviceName || 'Mobile phone').slice(0, 80);
