import { useNetworkState } from 'expo-network';

/** True unless the OS reports no connection (unknown is treated as online). */
export function useOnline() {
  const s = useNetworkState();
  return s.isConnected !== false && s.isInternetReachable !== false;
}
