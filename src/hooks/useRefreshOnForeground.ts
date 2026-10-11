import { useEffect } from 'react';
import { AppState } from 'react-native';

/** Re-runs `fn` whenever the app returns from the background (keeps server time & state fresh). */
export function useRefreshOnForeground(fn: () => void) {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') fn(); });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
