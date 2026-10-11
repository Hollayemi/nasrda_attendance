/**
 * Passkey (server-verified WebAuthn) support is built but switched OFF.
 * Attendance is verified with the phone's own Face ID / fingerprint instead (see lib/biometric.ts).
 * To enable passkeys later, set EXPO_PUBLIC_PASSKEY_ENABLED=true in .env and make a new build.
 */
export const PASSKEY_ENABLED = process.env.EXPO_PUBLIC_PASSKEY_ENABLED === 'true';
