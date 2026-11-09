import { useRef } from 'react';
import { Alert as NativeAlert, Pressable, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Card, Icon, ListRow, Pill, Screen, SectionTitle } from '@/components/ui';
import { api, getDebugInfo } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme';
import type { Device } from '@/types';
import { router } from 'expo-router';

export default function Account() {
  const { me, logout } = useAuth();
  const { data: devices = [] } = useQuery({ queryKey: ['devices'], queryFn: () => api.get('/staff/devices/').then((r) => r.data as Device[]) });
  const active = devices.find((d) => d.status === 'active');

  // Seven quick taps on the avatar silently copy the auth cookie, device token and last face_verification_id (as JSON) (no toast, haptic or alert).
  const taps = useRef({ n: 0, last: 0 });
  const onAvatarTap = () => {
    const now = Date.now();
    taps.current = { n: now - taps.current.last > 1500 ? 1 : taps.current.n + 1, last: now };
    if (taps.current.n >= 7) {
      taps.current.n = 0;
      void getDebugInfo().then((t) => Clipboard.setStringAsync(t)).catch(() => {});
    }
  };


  const confirmSignOut = () =>
    NativeAlert.alert('Sign out?', 'You will need your IPPIS number and password to sign back in.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
    ]);

  return (
    <Screen title="Account">
      <Card className="mt-3 flex-row items-center gap-4">
        <Pressable onPress={onAvatarTap} accessible={false}><Avatar name={me?.name ?? ''} size={60} /></Pressable>
        <View className="flex-1">
          <Text className="text-[19px] font-extrabold text-ink">{me?.name}</Text>
          <Text className="mt-0.5 text-[13px] text-ink-muted">IPPIS {me?.ippis_number}</Text>
          {me?.department ? <Text className="text-[13px] text-ink-muted">{me.department}</Text> : null}
        </View>
      </Card>

      <SectionTitle>Security</SectionTitle>
      <ListRow icon="scan-outline" title="Face verification" chevron onPress={() => router.push('/face')}
        subtitle={me?.face_enrolled ? (active ? `${active.label} · registered` : 'Enrolled · no phone registered') : 'Set up to mark attendance'}
        right={me?.face_enrolled ? (active ? <Pill label="ACTIVE" tone="green" /> : <Pill label="SET UP" tone="amber" />) : me?.require_face_verification ? <Pill label="REQUIRED" tone="red" /> : undefined} />
      <ListRow icon="key-outline" title="Change password" subtitle="Choose a new sign-in password" chevron onPress={() => router.push('/password')} />
      {me?.mfa_enabled ? (
        <ListRow icon="shield-checkmark-outline" title="Authenticator MFA" chevron onPress={() => router.push('/device')}
          subtitle={me.mfa_configured ? 'Configured' : 'Setup required'} right={<Pill label={me.mfa_configured ? 'ON' : 'SETUP'} tone={me.mfa_configured ? 'green' : 'amber'} />} />
      ) : null}

      <SectionTitle>Session</SectionTitle>
      <ListRow icon="log-out-outline" iconColor="#8E2B20" iconBg="#FDE2DF" title="Sign out" onPress={confirmSignOut} />

      <View className="mt-8 items-center gap-1">
        <Icon name="rocket-outline" size={18} color={colors.muted} />
        <Text className="text-[12px] text-ink-muted">NASRDA Staff Attendance · v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
      </View>
    </Screen>
  );
}