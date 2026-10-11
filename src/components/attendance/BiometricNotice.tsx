import { View } from 'react-native';
import { Alert, Button } from '@/components/ui';
import { openPhoneSettings, type BiometricStatus } from '@/lib/biometric';

/** Shown only when biometrics can't be used yet: explains what to do and links to phone settings. */
export function BiometricNotice({ status }: { status: BiometricStatus | null }) {
  if (!status || status.ready) return null;
  if (!status.hardware)
    return <Alert tone="error">This phone has no Face ID or fingerprint sensor, so it can't be used to mark attendance.</Alert>;
  return (
    <View>
      <Alert tone="warn">Set up Face ID or a fingerprint on this phone to mark attendance.</Alert>
      <Button className="mt-1" variant="secondary" size="sm" icon="settings-outline" title="Open phone settings" onPress={openPhoneSettings} />
    </View>
  );
}
