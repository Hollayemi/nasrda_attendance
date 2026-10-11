import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert, Button, TextField } from '@/components/ui';
import { api, errorOf } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { logo } from '@/lib/assets';
import { colors } from '@/theme';

type Mode = 'signin' | 'mfa' | 'reset';

export default function Login() {
  const { adoptSession } = useAuth();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('signin');
  const [ippis, setIppis] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setErr(''); setInfo('');
    try { await fn(); } catch (e) { setErr(errorOf(e).message); } finally { setBusy(false); }
  };

  const submit = () => run(async () => {
    const { data } = await api.post('/auth/login/', { ippis_number: ippis.trim(), password });
    if (data.mfa_required) { setMode('mfa'); return; }
    // The login response is the authoritative identity for this new server session.
    await adoptSession({ authenticated: true, ...data });
  });
  const verifyMfa = () => run(async () => {
    const { data } = await api.post('/auth/mfa/verify/', { code: mfaCode });
    await adoptSession({ authenticated: true, ...data });
  });
  const requestReset = () => run(async () => {
    const { data } = await api.post('/auth/password-reset/', { ippis_number: ippis.trim() });
    setInfo(data.message);
  });

  const back = (to: Mode) => { setMode(to); setErr(''); setInfo(''); setMfaCode(''); };

  return (
    <View className="flex-1 bg-surface">
      <StatusBar style="light" />
      <LinearGradient colors={[colors.navyDark, colors.navy, colors.navyLight]} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 340 }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
          <View className="w-full max-w-[460px] flex-1 self-center px-5">
            <View className="items-center">
              <View className="h-[104px] w-[104px] items-center justify-center rounded-full bg-white" style={{ elevation: 8, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}>
                <Image source={logo} contentFit="contain" style={{ width: 84, height: 84 }} accessibilityLabel="NASRDA" />
              </View>
              <Text className="mt-4 text-center text-[19px] font-extrabold leading-[25px] text-white">National Space Research{'\n'}and Development Agency</Text>
              <Text className="mt-1.5 text-[13px] font-semibold tracking-widest text-[#B9CBE0]">STAFF ATTENDANCE SYSTEM</Text>
            </View>

            <View className="mt-7 rounded-[24px] bg-white p-5" style={{ elevation: 6, shadowColor: '#0B2A4A', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }}>
              {mode === 'signin' && (
                <>
                  <Text className="text-[22px] font-extrabold text-ink">Welcome back</Text>
                  <Text className="mt-0.5 text-[13.5px] text-ink-muted">Sign in with your IPPIS number to continue.</Text>
                  <TextField label="IPPIS number" icon="person-outline" value={ippis} onChangeText={setIppis} keyboardType="number-pad"
                    autoCapitalize="none" autoCorrect={false} textContentType="username" autoComplete="username" returnKeyType="next" />
                  <TextField label="Password" icon="lock-closed-outline" secure value={password} onChangeText={setPassword}
                    autoCapitalize="none" autoCorrect={false} textContentType="password" autoComplete="current-password" returnKeyType="go" onSubmitEditing={submit} />
                  {err ? <Alert tone="error" className="mt-3">{err}</Alert> : null}
                  <Button className="mt-4" title={busy ? 'Signing in…' : 'Sign in'} loading={busy} disabled={!ippis || !password} onPress={submit} />
                  <Pressable onPress={() => { setMode('reset'); setErr(''); }} className="mt-3 self-center p-2 active:opacity-60">
                    <Text className="text-[14px] font-semibold text-navy">Forgot password?</Text>
                  </Pressable>
                </>
              )}

              {mode === 'mfa' && (
                <>
                  <View className="mb-1 h-12 w-12 items-center justify-center rounded-2xl bg-navy-50">
                    <Text className="text-[22px]">🔐</Text>
                  </View>
                  <Text className="text-[22px] font-extrabold text-ink">Verify sign-in</Text>
                  <Text className="mt-0.5 text-[13.5px] leading-[19px] text-ink-muted">Open your authenticator app and enter the current six-digit code.</Text>
                  <TextField label="Authenticator code" value={mfaCode} onChangeText={(t) => setMfaCode(t.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={6}
                    placeholder="000000" inputClassName="text-[22px] font-bold tracking-[8px]" onSubmitEditing={verifyMfa} />
                  {err ? <Alert tone="error" className="mt-3">{err}</Alert> : null}
                  <Button className="mt-4" title={busy ? 'Verifying…' : 'Verify and sign in'} loading={busy} disabled={mfaCode.length !== 6} onPress={verifyMfa} />
                  <Button className="mt-2.5" variant="secondary" title="Use a different account" disabled={busy} onPress={() => back('signin')} />
                </>
              )}

              {mode === 'reset' && (
                <>
                  <Text className="text-[22px] font-extrabold text-ink">Reset password</Text>
                  <Text className="mt-0.5 text-[13.5px] leading-[19px] text-ink-muted">Enter your IPPIS number. A new password will be sent to the email address registered on your account.</Text>
                  <TextField label="IPPIS number" icon="person-outline" value={ippis} onChangeText={setIppis} keyboardType="number-pad" autoCapitalize="none" autoCorrect={false} />
                  {err ? <Alert tone="error" className="mt-3">{err}</Alert> : null}
                  {info ? <Alert tone="success" className="mt-3">{info}</Alert> : null}
                  <Button className="mt-4" title={busy ? 'Sending…' : 'Email new password'} loading={busy} disabled={!ippis} onPress={requestReset} />
                  <Button className="mt-2.5" variant="secondary" title="Back to sign in" disabled={busy} onPress={() => back('signin')} />
                </>
              )}
            </View>

            <View className="flex-1" />
            <Text className="mt-6 text-center text-[12px] text-ink-muted">© {new Date().getFullYear()} NASRDA · Authorised staff only</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
