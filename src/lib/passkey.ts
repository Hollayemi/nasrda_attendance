import { Passkey } from 'react-native-passkey';

/**
 * Thin wrapper over native passkeys (WebAuthn via Face ID / fingerprint). The server already
 * emits standard WebAuthn JSON, so we hand it straight to the OS and return the standard
 * result. Passkeys need a development build; in Expo Go `isSupported()` is false and callers
 * show a helpful message instead of crashing.
 */
export const passkeysSupported = () => {
  try { return Passkey.isSupported(); } catch { return false; }
};

const cancelled = (e: any) => e?.error === 'UserCancelled' || /cancel/i.test(String(e?.message ?? ''));
const translate = (e: any) => {
  if (cancelled(e)) return { code: 'CANCELLED', message: 'Biometric verification was cancelled.' };
  if (e?.error === 'BadConfiguration')
    return { code: 'PASSKEY_CONFIG', message: 'This build is not linked to the attendance domain yet (associated domain / asset links).' };
  if (e?.error === 'NotSupported' || /link/i.test(String(e?.message ?? '')))
    return { code: 'PASSKEY_UNSUPPORTED', message: 'Biometric passkeys need the installed NASRDA app build. They are not available in Expo Go.' };
  if (e?.error === 'CredentialAlreadyExists')
    return { code: 'PASSKEY_EXISTS', message: 'A passkey for this account already exists on this phone.' };
  return { code: 'PASSKEY_FAILED', message: 'Biometric verification failed. Please try again.' };
};

export async function createPasskey(optionsJSON: any) {
  try {
    const r = await Passkey.create(optionsJSON);
    return { ...r, type: r.type ?? 'public-key', clientExtensionResults: r.clientExtensionResults ?? {} };
  } catch (e) { throw translate(e); }
}

export async function getPasskey(optionsJSON: any) {
  try {
    const r = await Passkey.get(optionsJSON);
    return { ...r, rawId: r.rawId ?? r.id, type: r.type ?? 'public-key', clientExtensionResults: r.clientExtensionResults ?? {} };
  } catch (e) { throw translate(e); }
}
