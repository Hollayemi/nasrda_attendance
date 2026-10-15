import { Linking, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

/**
 * Biometric readiness only (hardware + enrolment), used to guide the person before device
 * registration and check-in. Actual verification is a server-verified passkey (lib/passkey.ts).
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

export const openPhoneSettings = () => Linking.openSettings().catch(() => {});