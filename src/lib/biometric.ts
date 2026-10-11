import { Linking, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

/**
 * Face ID / Touch ID / fingerprint verification, using the phone's own biometrics only.
 * No device-passcode fallback is offered or requested.
 */
export type BiometricKind = 'face' | 'fingerprint' | 'both';

export type BiometricStatus = {
  /** Phone has a biometric sensor */
  hardware: boolean;
  /** At least one face / fingerprint is enrolled */
  enrolled: boolean;
  /** Ready to use right now */
  ready: boolean;
  kind: BiometricKind;
  /** Name to show in the interface, e.g. "Face ID", "Touch ID", "fingerprint" */
  method: string;
};

const FALLBACK: BiometricStatus = { hardware: true, enrolled: true, ready: true, kind: 'fingerprint', method: 'Face ID or fingerprint' };

export async function getBiometricStatus(): Promise<BiometricStatus> {
  try {
    const [hardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    const finger = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
    const kind: BiometricKind = face && finger ? 'both' : face ? 'face' : 'fingerprint';
    const method =
      Platform.OS === 'ios' ? (face ? 'Face ID' : 'Touch ID')
      : kind === 'both' ? 'fingerprint or face'
      : kind === 'face' ? 'face unlock'
      : 'fingerprint';
    return { hardware, enrolled, ready: hardware && enrolled, kind, method };
  } catch {
    return FALLBACK;
  }
}

export type BiometricFailure = { code: string; message: string };

const messages: Record<string, string> = {
  user_cancel: 'Verification was cancelled.',
  system_cancel: 'Verification was interrupted. Please try again.',
  app_cancel: 'Verification was interrupted. Please try again.',
  authentication_failed: 'We could not recognise you. Please try again.',
  not_enrolled: 'No Face ID or fingerprint is set up on this phone. Add one in your phone settings, then try again.',
  not_available: 'Face ID or fingerprint is not available on this phone.',
  lockout: 'Too many unsuccessful attempts, so biometrics are locked for a moment. Lock and unlock your phone, then try again.',
  timeout: 'Verification timed out. Please try again.',
  unable_to_process: 'The sensor could not read you. Clean the sensor and try again.',
  no_space: 'Your phone is low on storage. Free some space and try again.',
};

/**
 * Prompts for Face ID / fingerprint. Resolves on success, throws a BiometricFailure otherwise.
 * `disableDeviceFallback` + empty `fallbackLabel` hide any passcode option; on Android only strong
 * biometrics (fingerprint, 3D face) are accepted.
 */
export async function verifyBiometric(reason = 'Confirm it is you to mark attendance'): Promise<void> {
  const status = await getBiometricStatus();
  if (!status.hardware) throw { code: 'not_available', message: messages.not_available } satisfies BiometricFailure;
  if (!status.enrolled) throw { code: 'not_enrolled', message: messages.not_enrolled } satisfies BiometricFailure;

  const res = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    cancelLabel: 'Cancel',
    disableDeviceFallback: true,
    fallbackLabel: '',
    biometricsSecurityLevel: 'strong',
    requireConfirmation: false,
  });
  if (res.success) return;
  const code = res.error ?? 'unknown';
  throw {
    code: code === 'user_cancel' ? 'CANCELLED' : code,
    message: messages[code] ?? 'Biometric verification failed. Please try again.',
  } satisfies BiometricFailure;
}

export const openPhoneSettings = () => Linking.openSettings().catch(() => {});
