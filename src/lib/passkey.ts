import { NativeModules, Platform } from 'react-native';
import { Passkey } from 'react-native-passkey';

/**
 * Thin wrapper over native passkeys (WebAuthn via Face ID / fingerprint / device passcode).
 * The server already emits standard WebAuthn JSON, so we hand it straight to the OS and
 * return the standard result.
 *
 * Errors are translated into plain-language messages, and the original code and native
 * message are kept (`detail`) and appended in brackets so a failure can be diagnosed
 * instead of being hidden behind a generic message.
 */
export type PasskeyFailure = { code: string; message: string; detail?: string };

/**
 * True only when the native module is really linked. `Passkey.isSupported()` merely checks the
 * OS version, so it reports true even in Expo Go where the module does not exist.
 */
export const passkeysLinked = () => !!NativeModules.Passkey;
export const passkeysSupported = () => {
  try { return passkeysLinked() && Passkey.isSupported(); } catch { return false; }
};

const text = (e: any) => String(e?.message ?? e ?? '');
const detailOf = (e: any) => [e?.error ?? e?.code ?? e?.name, text(e)].filter(Boolean).join(' — ').slice(0, 220);

const withDetail = (message: string, detail?: string) => (detail ? `${message} [${detail}]` : message);

export function translatePasskeyError(e: any): PasskeyFailure {
  const kind = String(e?.error ?? e?.code ?? '');
  const msg = text(e);
  const detail = detailOf(e);

  if (kind === 'UserCancelled' || /cancel/i.test(msg))
    return { code: 'CANCELLED', message: 'Verification was cancelled.' };

  if (/doesn't seem to be linked|not linked/i.test(msg) || e?.code === 'PASSKEY_NOT_LINKED')
    return { code: 'PASSKEY_NOT_LINKED', message: 'Passkeys are not available in this build. Install the NASRDA app build (not Expo Go) and try again.', detail };

  if (kind === 'NotSupported')
    return { code: 'PASSKEY_UNSUPPORTED', message: 'This phone does not support passkeys. It needs iOS 16+ or Android 9+ with a Google account and a screen lock.', detail };

  if (kind === 'NoCreateOption')
    return { code: 'PASSKEY_NO_LOCK', message: 'No passkey provider is available. Set a screen lock (fingerprint, face, PIN or password) in your phone settings, and on Android make sure you are signed in to a Google account.', detail };

  if (kind === 'NoCredentials')
    return { code: 'PASSKEY_NO_CREDENTIAL', message: 'No passkey for this account was found on this phone. Register this device again from Account → Device & biometrics.', detail };

  if (kind === 'CredentialAlreadyExists')
    return { code: 'PASSKEY_EXISTS', message: 'A passkey for this account already exists on this phone.', detail };

  if (kind === 'TimedOut')
    return { code: 'PASSKEY_TIMEOUT', message: 'Verification timed out. Please try again.', detail };

  if (kind === 'Interrupted')
    return { code: 'PASSKEY_INTERRUPTED', message: 'Verification was interrupted. Please try again.', detail };

  // Domain not linked to this app (Android: assetlinks.json, iOS: apple-app-site-association).
  if (kind === 'BadConfiguration' || /rp id|relying party|assetlinks|associated domain|origin/i.test(msg))
    return { code: 'PASSKEY_CONFIG', message: 'This app build is not linked to the attendance domain yet, so the phone refused the passkey. The server team must publish the app-link file for this app.', detail };

  return { code: 'PASSKEY_FAILED', message: 'Biometric or passcode verification failed. Please try again.', detail };
}

/** Message shown to the person (includes technical detail when the cause is not a user action). */
export const passkeyMessage = (f: PasskeyFailure) => (f.code === 'CANCELLED' ? f.message : withDetail(f.message, f.detail));

const assertLinked = () => {
  if (!passkeysLinked()) throw { error: 'NotLinked', code: 'PASSKEY_NOT_LINKED', message: "The package 'react-native-passkey' doesn't seem to be linked." };
};

export async function createPasskey(optionsJSON: any) {
  try {
    assertLinked();
    const r = await Passkey.create(optionsJSON);
    return { ...r, type: r.type ?? 'public-key', clientExtensionResults: r.clientExtensionResults ?? {} };
  } catch (e) { throw translatePasskeyError(e); }
}

export async function getPasskey(optionsJSON: any) {
  try {
    assertLinked();
    const r = await Passkey.get(optionsJSON);
    return { ...r, rawId: r.rawId ?? r.id, type: r.type ?? 'public-key', clientExtensionResults: r.clientExtensionResults ?? {} };
  } catch (e) { throw translatePasskeyError(e); }
}

export const platformAuthLabel = () => (Platform.OS === 'ios' ? 'Face ID / Touch ID' : 'fingerprint / face unlock');
