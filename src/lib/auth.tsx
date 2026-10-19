import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, setUnauthorizedHandler } from '@/lib/api';
import { deviceToken } from '@/lib/device';
import type { Me } from '@/types';

type Ctx = {
  me?: Me;
  loading: boolean;
  refresh: () => void;
  adoptSession: (me: Me) => Promise<void>;
  logout: () => Promise<void>;
};
const AuthCtx = createContext<Ctx>(null!);
export const useAuth = () => useContext(AuthCtx);

const ANONYMOUS = { authenticated: false } as Me;

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  // Holds the identity right after login/logout so navigation permissions switch instantly,
  // without waiting on (or being overwritten by) an in-flight `me` request from the previous user.
  const [override, setOverride] = useState<Me | undefined>();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['me'],
    // The device token lets the server say whether THIS phone is the one registered for the account.
    queryFn: async () => api.get('/auth/me/', { headers: { 'X-Attendance-Device-Token': await deviceToken() } }).then((r) => r.data as Me),
  });
  const me = override ?? data;

  const refresh = useCallback(() => {
    void refetch().then((r) => { if (r.data) setOverride(r.data); });
  }, [refetch]);

  const adoptSession = useCallback(async (identity: Me) => {
    await qc.cancelQueries({ queryKey: ['me'] });
    qc.setQueryData(['me'], identity);
    setOverride(identity);
  }, [qc]);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout/'); } catch { /* an expired/offline session should still reach the login screen */ }
    await qc.cancelQueries();
    qc.clear(); // drop every cached list (attendance, staff, …)
    qc.setQueryData(['me'], ANONYMOUS);
    setOverride(ANONYMOUS);
  }, [qc]);

  // If the server says the session is gone (9-hour expiry), fall back to the login screen.
  useEffect(() => {
    setUnauthorizedHandler(() => { qc.clear(); qc.setQueryData(['me'], ANONYMOUS); setOverride(ANONYMOUS); });
    return () => setUnauthorizedHandler(null);
  }, [qc]);

  const value = useMemo(
    () => ({ me, loading: override === undefined ? isLoading : false, refresh, adoptSession, logout }),
    [me, override, isLoading, refresh, adoptSession, logout],
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
