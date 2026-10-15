import { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as SecureStore from 'expo-secure-store';
import { Alert, Button, Card, Icon, Muted, Screen, TextField } from '@/components/ui';
import { api, errorOf } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme';

const MFA_FLAG = 'mfa-setup-in-progress';

export default function DeviceSetup() {
  const { me, refresh } = useAuth();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaUri, setMfaUri] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaBusy, setMfaBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  // The user leaves the app to read the code from their authenticator; remember enrolment is in progress.
  const [mfaStarted, setMfaStarted] = useState(false);
  useEffect(() => { SecureStore.getItemAsync(MFA_FLAG).then((v) => setMfaStarted(v === 'true')).catch(() => {}); }, []);


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

  return (
    <Screen>
      {msg ? <Alert tone={msg.ok ? 'success' : 'error'} className="mt-2">{msg.text}</Alert> : null}
      <Muted className="mt-2">This authenticator app is used for sign-in only. Attendance uses camera face verification.</Muted>

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
      ) : <Card className="mt-3"><Muted>Authenticator MFA is not required for your account.</Muted></Card>}
    </Screen>
  );
}
