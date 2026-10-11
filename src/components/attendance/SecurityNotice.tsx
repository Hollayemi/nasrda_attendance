import { View } from 'react-native';
import { Alert, Button } from '@/components/ui';
import { openPhoneSettings, type Security } from '@/lib/security';

/**
 * Tells the person what the phone will ask for. When there is no screen lock at all it explains
 * how to fix that; when only a passcode exists it explains that the passcode is used as the fallback.
 */
export function SecurityNotice({ sec }: { sec: Security | null }) {
  if (!sec || sec.level === 'biometric' || sec.level === 'unknown') return null;
  if (sec.level === 'none')
    return (
      <View>
        <Alert tone="error">
          This phone has no screen lock, so it can't verify you. Set up a fingerprint, face unlock, PIN or password in your phone settings, then come back.
        </Alert>
        <Button className="mt-1" variant="secondary" size="sm" icon="settings-outline" title="Open phone settings" onPress={openPhoneSettings} />
      </View>
    );
  return (
    <Alert tone="info">
      No fingerprint or face is set up on this phone, so you'll verify with your device passcode instead. You can add a fingerprint or face in your phone settings at any time.
    </Alert>
  );
}
