import { Linking, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

export type Security = {
  /** none = no screen lock at all, passcode = PIN/pattern/password only, biometric = fingerprint or face enrolled */
  level: 'none' | 'passcode' | 'biometric' | 'unknown';
  /** What the person will be asked to use, in plain words. */
  method: string;
  /** True when the OS will ask for the device passcode instead of a biometric. */
  passcodeFallback: boolean;
};

const UNKNOWN: Security = { level: 'unknown', method: 'biometrics or your device passcode', passcodeFallback: false };

export async function getDeviceSecurity(): Promise<Security> {
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    const finger = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);

    if (level === LocalAuthentication.SecurityLevel.NONE)
      return { level: 'none', method: 'a screen lock', passcodeFallback: false };

    if (level === LocalAuthentication.SecurityLevel.SECRET)
      return { level: 'passcode', method: 'your device passcode', passcodeFallback: true };

    // Biometric enrolled. Name the method the phone actually has.
    const method = Platform.OS === 'ios'
      ? (face ? 'Face ID' : 'Touch ID')
      : face && !finger ? 'face unlock' : finger && !face ? 'your fingerprint' : 'your fingerprint or face';
    return { level: 'biometric', method, passcodeFallback: false };
  } catch {
    return UNKNOWN;
  }
}

export const openPhoneSettings = () => Linking.openSettings().catch(() => {});
