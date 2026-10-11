import { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as SecureStore from 'expo-secure-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, ButtonRow, Card, Icon, Loading, Muted, Pill, Screen, TextField } from '@/components/ui';
import { api, errorOf } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fmtDate } from '@/lib/format';
import { createPasskey, passkeyMessage, passkeysLinked } from '@/lib/passkey';
import { useBiometric } from '@/hooks/useBiometric';
import { BiometricNotice } from '@/components/attendance/BiometricNotice';
import { verifyBiometric } from '@/lib/biometric';
import { PASSKEY_ENABLED } from '@/lib/config';
import { colors } from '@/theme';
import type { Device } from '@/types';

const MFA_FLAG = 'mfa-setup-in-progress';

export default function DeviceSetup() {
  const { me, refresh } = useAuth();
  const { status: bio } = useBiometric();
  const [testing, setTesting] = useState(false);
  const qc = useQueryClient();
  const [label, setLabel] = useState(`${me?.last_name?.trim() || 'My'}'s Phone`);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null);
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaUri, setMfaUri] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaBusy, setMfaBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  // The user leaves the app to read the code from their authenticator; remember enrolment is in progress.
  const [mfaStarted, setMfaStarted] = useState(false);
  useEffect(() => { SecureStore.getItemAsync(MFA_FLAG).then((v) => setMfaStarted(v === 'true')).catch(() => {}); }, []);

  const { data: devices = [], isLoading } = useQuery({ queryKey: ['devices'], queryFn: () => api.get('/staff/devices/').then((r) => r.data as Device[]) });
  const active = devices.find((d) => d.status === 'active');
  const pending = devices.find((d) => d.status === 'pending');

  const testBiometric = async () => {
    setTesting(true); setMsg(null);
    try {
      await verifyBiometric('Test ' + (bio?.method ?? 'biometrics'));
      setMsg({ ok: true, text: `${bio?.method ?? 'Biometrics'} is working on this phone. You're ready to mark attendance.` });
    } catch (e: any) {
      setMsg({ ok: false, text: e?.code === 'CANCELLED' ? 'Test was cancelled.' : e?.message ?? 'Biometric verification failed. Please try again.' });
    } finally { setTesting(false); }
  };

  const register = async () => {
    setMsg(null);
    setBusy(true);
    try {
      const { data: optionsJSON } = await api.post('/staff/device/register/options/');
      const credential = await createPasskey(optionsJSON); // biometric prompt
      const { data } = await api.post('/staff/device/register/verify/', { credential, label });
      qc.setQueryData<Device[]>(['devices'], (cur = []) => [...cur.filter((d) => d.id !== data.id), data as Device]);
      setMsg({ ok: true, text: data.status === 'pending' ? 'Device registered. Waiting for administrator approval.' : 'Device registered. You can now check in.' });
      refresh();
      qc.invalidateQueries({ queryKey: ['devices'] });
    } catch (e: any) {
      setMsg({ ok: false, text: e?.code === 'CANCELLED' ? 'Setup was cancelled.' : e?.code?.startsWith?.('PASSKEY') ? passkeyMessage(e) : errorOf(e).message });
    } finally { setBusy(false); }
  };

  const revoke = useMutation({
    mutationFn: (id: number) => api.post(`/staff/devices/${id}/revoke/`),
    onSuccess: () => { setConfirmRemove(null); setMsg({ ok: true, text: 'Removal request sent. Administrator must approve it before this device is removed.' }); qc.invalidateQueries({ queryKey: ['devices'] }); },
    onError: (e) => setMsg({ ok: false, text: errorOf(e).message }),
  });

  const loadMfaSetup = async () => {
    const { data } = await api.post('/staff/mfa/setup/');
    setMfaSecret(data.secret); setMfaUri(data.provisioning_uri);
  };
  const startMfa = async () => {
    setMfaBusy(true); setMsg(null);
    try { await SecureStore.setItemAsync(MFA_FLAG, 'true'); setMfaStarted(true); await loadMfaSetup(); }
    catch (e) { setMsg({ ok: false, text: errorOf(e).message }); }
    finally { setMfaBusy(false); }
  };
  const confirmMfa = async () => {
    setMfaBusy(true); setMsg(null);
    try {
      await api.post('/staff/mfa/confirm/', { code: mfaCode });
      await SecureStore.deleteItemAsync(MFA_FLAG).catch(() => {});
      setMfaStarted(false); setMfaSecret(''); setMfaUri(''); setMfaCode('');
      setMsg({ ok: true, text: 'Authenticator MFA is configured and will be required at your next sign-in.' });
      refresh();
    } catch (e) { setMsg({ ok: false, text: errorOf(e).message }); }
    finally { setMfaBusy(false); }
  };
  useEffect(() => {
    if (!mfaStarted || !me?.mfa_enabled || me.mfa_configured || mfaSecret) return;
    setMfaBusy(true);
    loadMfaSetup().catch((e) => setMsg({ ok: false, text: errorOf(e).message })).finally(() => setMfaBusy(false));
  }, [mfaStarted, me?.mfa_enabled, me?.mfa_configured, mfaSecret]);

  const copySecret = async () => { await Clipboard.setStringAsync(mfaSecret); setCopied(true); setTimeout(() => setCopied(false), 1800); };
  const openAuthenticator = () => Linking.openURL(mfaUri).catch(() => setMsg({ ok: false, text: 'No authenticator app found. Copy the setup key and add it manually.' }));

  if (isLoading) return <Screen><Loading /></Screen>;

  return (
    <Screen>
      {msg ? <Alert tone={msg.ok ? 'success' : 'error'} className="mt-2">{msg.text}</Alert> : null}

      {!PASSKEY_ENABLED ? (
        <Card className="mt-2">
          <View className="items-center py-2">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-navy-50">
              <Icon name={bio?.kind === 'face' ? 'scan-outline' : 'finger-print'} size={34} color={colors.navy} />
            </View>
            <Text className="mt-3 text-[18px] font-extrabold text-ink">{bio?.method ? `Verify with ${bio.method}` : 'Biometric verification'}</Text>
            <Muted className="mt-1 text-center">Your Face ID or fingerprint is checked on this phone each time you check in or out. It is never sent to NASRDA.</Muted>
            {bio ? <View className="mt-3"><Pill label={bio.ready ? 'READY' : bio.hardware ? 'SET UP NEEDED' : 'NOT AVAILABLE'} tone={bio.ready ? 'green' : bio.hardware ? 'amber' : 'red'} /></View> : null}
          </View>
          <BiometricNotice status={bio} />
          <Button className="mt-3" variant="secondary" icon={bio?.kind === 'face' ? 'scan-outline' : 'finger-print'} title={testing ? 'Waiting…' : `Test ${bio?.method ?? 'biometrics'}`} loading={testing} disabled={!bio?.ready} onPress={testBiometric} />
        </Card>
      ) : active ? (
        <Card className="mt-2">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-tint-green"><Icon name="phone-portrait-outline" size={24} color={colors.green} /></View>
            <View className="flex-1">
              <Text className="text-[16px] font-extrabold text-ink">Device registered</Text>
              <Muted>{active.label}</Muted>
            </View>
            <Icon name="checkmark-circle" size={26} color={colors.green} />
          </View>
          <View className="mt-3 flex-row gap-6">
            <View><Muted>Registered</Muted><Text className="text-[14px] font-bold text-ink">{fmtDate(active.registered_at)}</Text></View>
            <View><Muted>Last used</Muted><Text className="text-[14px] font-bold text-ink">{fmtDate(active.last_seen_at)}</Text></View>
          </View>
          <Muted className="mt-3">This device is bound to your account for check-in and check-out. Nothing else to do here.</Muted>
          {active.removal_pending ? (
            <Alert tone="warn" className="mt-3">Device removal is awaiting administrator approval. You can keep using this device until it is approved.</Alert>
          ) : confirmRemove === active.id ? (
            <View className="mt-3">
              <Alert tone="warn">Your administrator must approve this request. Once approved, you can't check in or out until you register a new device.</Alert>
              <View className="mt-2"><ButtonRow>
                <Button variant="secondary" title="Cancel" onPress={() => setConfirmRemove(null)} />
                <Button variant="danger" title="Send request" loading={revoke.isPending} onPress={() => revoke.mutate(active.id)} />
              </ButtonRow></View>
            </View>
          ) : (
            <Button className="mt-3" variant="danger" size="sm" icon="trash-outline" title="Remove this device" onPress={() => setConfirmRemove(active.id)} />
          )}
        </Card>
      ) : pending ? (
        <Card className="mt-2 items-center py-6">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-tint-amber"><Icon name="hourglass-outline" size={26} color="#6E5100" /></View>
          <Text className="mt-3 text-[17px] font-extrabold text-ink">Waiting for approval</Text>
          <Muted className="mt-1 text-center">{pending.label} was registered and is waiting for an administrator to approve it before you can check in.</Muted>
        </Card>
      ) : (
        <Card className="mt-2">
          <View className="items-center py-2">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-navy-50"><Icon name="finger-print" size={34} color={colors.navy} /></View>
            <Text className="mt-3 text-[18px] font-extrabold text-ink">Register this phone</Text>
            <Muted className="mt-1 text-center">Your fingerprint or face stays on your device. NASRDA only stores a secure key that proves it is this device.</Muted>
          </View>
          {!passkeysLinked() ? <Alert tone="warn">Passkeys don't work in Expo Go. Install the NASRDA development build (npx expo run:android / run:ios) to register this device.</Alert> : null}
          <TextField label="Device name" value={label} onChangeText={setLabel} />
          <Button className="mt-4" icon="finger-print" title={busy ? 'Registering…' : 'Register this device'} loading={busy} disabled={!label.trim() || !passkeysLinked()} onPress={register} />
        </Card>
      )}

      {me?.mfa_enabled ? (
        <Card className="mt-3">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-navy-50"><Icon name="shield-checkmark-outline" size={20} color={colors.navy} /></View>
            <Text className="flex-1 text-[17px] font-extrabold text-ink">Authenticator app MFA</Text>
          </View>
          {me.mfa_configured ? (
            <Alert tone="success" className="mt-3">Authenticator MFA is configured for this account.</Alert>
          ) : mfaSecret ? (
            <>
              <Muted className="mt-3">Open Google Authenticator, Microsoft Authenticator, Authy or similar, add an account with the setup key below, and choose <Text className="font-bold">Time based</Text>.</Muted>
              <Button className="mt-3" variant="secondary" icon="open-outline" title="Open in authenticator app" onPress={openAuthenticator} />
              <Text className="mb-1.5 mt-4 text-[13px] font-semibold text-ink">Setup key</Text>
              <View className="flex-row items-center gap-2 rounded-xl border border-surface-input bg-surface px-3 py-3">
                <Text selectable className="flex-1 text-[15px] font-bold tracking-widest text-ink">{mfaSecret}</Text>
                <Button size="sm" variant="ghost" icon={copied ? 'checkmark' : 'copy-outline'} title={copied ? 'Copied' : 'Copy'} onPress={copySecret} />
              </View>
              <TextField label="Authenticator code" value={mfaCode} onChangeText={(t) => setMfaCode(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" textContentType="oneTimeCode" maxLength={6} placeholder="000000" inputClassName="text-[20px] font-bold tracking-[6px]" />
              <Button className="mt-4" title={mfaBusy ? 'Confirming…' : 'Confirm MFA'} loading={mfaBusy} disabled={mfaCode.length !== 6} onPress={confirmMfa} />
            </>
          ) : (
            <>
              <Muted className="mt-3">Your administrator requires MFA for this account. Configure it now using any standard authenticator app.</Muted>
              <Button className="mt-3" title={mfaBusy ? 'Preparing…' : 'Set up authenticator app'} loading={mfaBusy} onPress={startMfa} />
            </>
          )}
        </Card>
      ) : null}
    </Screen>
  );
}
