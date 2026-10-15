import { useEffect, useRef } from 'react';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme';

const screens: [string, string][] = [
  ['face', 'Face verification'], ['device', 'Authenticator MFA'], ['password', 'Change password'],
  ['admin/approvals', 'Approvals'], ['admin/staff', 'Staff'], ['admin/departments', 'Departments'],
  ['admin/holidays', 'Holidays'], ['admin/roles', 'Roles & permissions'], ['admin/settings', 'System settings'],
  ['admin/reports', 'Reports'], ['admin/audit', 'Audit log'], ['admin/geofence', 'Geofences'],
];

export default function AppLayout() {
  const { me } = useAuth();
  const prompted = useRef(false);

  // Staff whose MFA is required but not yet enrolled are taken straight to setup (once per session).
  useEffect(() => {
    if (me?.mfa_enabled && !me.mfa_configured && !prompted.current) {
      prompted.current = true;
      setTimeout(() => router.push('/device'), 0);
    }
  }, [me?.mfa_enabled, me?.mfa_configured]);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.navy,
        headerTitleStyle: { color: colors.ink, fontWeight: '800' },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      {screens.map(([name, title]) => <Stack.Screen key={name} name={name} options={{ title }} />)}
    </Stack>
  );
}
