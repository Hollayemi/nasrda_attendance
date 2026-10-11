import { Alert as NativeAlert, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Card, Icon, ListRow, Pill, Screen, SectionTitle } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme';
import type { Device } from '@/types';
import { router } from 'expo-router';
import { useBiometric } from '@/hooks/useBiometric';
import { PASSKEY_ENABLED } from '@/lib/config';

export default function Account() {
  const { me, logout } = useAuth();
  const { status: bio } = useBiometric();
  const { data: devices = [] } = useQuery({ queryKey: ['devices'], queryFn: () => api.get('/staff/devices/').then((r) => r.data as Device[]) });
  const active = devices.find((d) => d.status === 'active');
  const pending = devices.find((d) => d.status === 'pending');

  const confirmSignOut = () =>
    NativeAlert.alert('Sign out?', 'You will need your IPPIS number and password to sign back in.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
    ]);

  return (
    <Screen title="Account">
      <Card className="mt-3 flex-row items-center gap-4">
        <Avatar name={me?.name ?? ''} size={60} />
        <View className="flex-1">
          <Text className="text-[19px] font-extrabold text-ink">{me?.name}</Text>
          <Text className="mt-0.5 text-[13px] text-ink-muted">IPPIS {me?.ippis_number}</Text>
          {me?.department ? <Text className="text-[13px] text-ink-muted">{me.department}</Text> : null}
        </View>
      </Card>

      <SectionTitle>Security</SectionTitle>
      <ListRow icon={!PASSKEY_ENABLED && bio?.kind === 'face' ? 'scan-outline' : 'finger-print'} title={PASSKEY_ENABLED ? 'Device & biometrics' : 'Face ID & fingerprint'} chevron onPress={() => router.push('/device')}
        subtitle={!PASSKEY_ENABLED ? (bio?.ready ? `${bio.method} is ready` : bio && !bio.hardware ? 'Not available on this phone' : 'Set up in your phone settings') : active ? `${active.label} · registered` : pending ? 'Waiting for approval' : 'No device registered'}
        right={!PASSKEY_ENABLED ? (bio ? <Pill label={bio.ready ? 'READY' : bio.hardware ? 'SET UP' : 'N/A'} tone={bio.ready ? 'green' : bio.hardware ? 'amber' : 'red'} /> : undefined) : active ? <Pill label="ACTIVE" tone="green" /> : pending ? <Pill label="PENDING" tone="amber" /> : me?.require_passkey ? <Pill label="REQUIRED" tone="red" /> : undefined} />
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
