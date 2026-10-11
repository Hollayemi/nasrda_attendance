import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getDeviceSecurity, type Security } from '@/lib/security';

/** Phone lock/biometric status. Re-checks when the app returns from Settings. */
export function useDeviceSecurity() {
  const [sec, setSec] = useState<Security | null>(null);
  const refresh = useCallback(() => { getDeviceSecurity().then(setSec); }, []);
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refresh(); });
    return () => sub.remove();
  }, [refresh]);
  return { sec, refresh };
}
