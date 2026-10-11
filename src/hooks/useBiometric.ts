import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getBiometricStatus, type BiometricStatus } from '@/lib/biometric';

/** Biometric readiness. Re-checks when the app returns from phone Settings. */
export function useBiometric() {
  const [status, setStatus] = useState<BiometricStatus | null>(null);
  const refresh = useCallback(() => { getBiometricStatus().then(setStatus); }, []);
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refresh(); });
    return () => sub.remove();
  }, [refresh]);
  return { status, refresh };
}
