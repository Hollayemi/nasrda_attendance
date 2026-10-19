import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ActionButton } from '@/components/attendance/ActionButton';
import { ActivitySheet } from '@/components/attendance/ActivitySheet';
import { Alert, Card, Icon, Muted, Pill, Screen, type IconName } from '@/components/ui';
import { useOnline } from '@/hooks/useOnline';
import { useRefreshOnForeground } from '@/hooks/useRefreshOnForeground';
import { api, errorOf, type ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dur, fmtHM, fmtLongDate, fmtTime, greeting, lagosHM } from '@/lib/format';
import { getPosition } from '@/lib/geo';
import { deviceToken } from '@/lib/device';
import { FaceCapture } from '@/components/face/FaceCapture';
import { colors } from '@/theme';
import type { Today } from '@/types';

const hm5 = (s: string) => s.slice(0, 5);

export default function Home() {
  const { me, refresh: refreshMe } = useAuth();
  const qc = useQueryClient();
  const online = useOnline();
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState<ApiError | null>(null);
  const [success, setSuccess] = useState('');
  const [sheet, setSheet] = useState(false);
  const [faceAction, setFaceAction] = useState<'check-in' | 'check-out' | null>(null);

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['today'],
    queryFn: () => api.get('/attendance/today/').then((r) => r.data as Today),
    refetchInterval: 60_000,
  });
  useFocusEffect(useCallback(() => { void refetch(); refreshMe(); }, [refetch, refreshMe]));
  useRefreshOnForeground(() => { void refetch(); });

  /** Face verification (camera) has already produced a one-use id; now online → GPS → server (which re-verifies everything). */
  async function attend(kind: 'check-in' | 'check-out', faceVerificationId?: string) {
    setErr(null); setSuccess('');
    try {
      if (!online) throw { code: 'OFFLINE', message: 'Internet connection is required to verify and record attendance.' };
      setBusy('Getting your location…');
      const fix = await getPosition();
      setBusy('Recording attendance…');
      await api.post(`/attendance/${kind}/`, { ...fix, face_verification_id: faceVerificationId, device_token: await deviceToken() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setSuccess(kind === 'check-in' ? 'CHECK-IN SUCCESSFUL' : 'CHECK-OUT SUCCESSFUL');
      setSheet(false);
      qc.invalidateQueries({ queryKey: ['today'] });
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      const failure = e?.code && e?.message && !e.response ? e : errorOf(e);
      if (['DEVICE_NOT_REGISTERED', 'DEVICE_REGISTRATION_REQUIRED', 'FACE_ENROLLMENT_REQUIRED'].includes(failure.code)) refreshMe();
      setErr(failure);
    } finally { setBusy(''); }
  }

  /** Open the camera first (offline check up front so the person doesn't verify for nothing). */
  function startFace(kind: 'check-in' | 'check-out') {
    setErr(null); setSuccess('');
    if (!online) return setErr({ code: 'OFFLINE', message: 'Internet connection is required to verify and record attendance.' } as ApiError);
    setFaceAction(kind);
  }

  const rec = data?.record;
  const state = data?.state ?? 'not_checked_in';
  const needsFace = !!me?.require_face_verification && !me?.face_enrolled;
  const needsDevice = !!me?.require_approved_device && !me?.has_current_approved_device;
  // The account has a registered phone, but it isn't this one.
  const wrongDevice = needsDevice && !!me?.has_approved_device;
  const checkoutAfter = hm5(data?.checkout_allowed_after ?? '16:30');
  const checkinClosesAfter = hm5(data?.checkin_closes_after ?? '12:00');
  const checkinOpen = data?.checkin_open ?? true;
  const nonWorking = data?.non_working_reason ?? null;
  const checkoutOpen = !!data?.server_time && lagosHM(data.server_time) >= checkoutAfter;

  const statusLabel = state === 'not_checked_in' ? 'Not checked in' : state === 'checked_in' ? 'Checked in' : 'Checked out';
  const dot = state === 'checked_in' ? '#4ADE80' : state === 'checked_out' ? '#93C5FD' : '#FCD34D';

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refetch()} title="">
      {/* Hero */}
      <LinearGradient colors={[colors.navy, colors.navyLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ borderRadius: 24, padding: 20, marginTop: -2, overflow: 'hidden' }}>
        <View className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
        <View className="absolute -bottom-16 right-10 h-32 w-32 rounded-full bg-white/5" />
        <Text className="text-[13px] font-medium text-[#B9CBE0]">{fmtLongDate()}</Text>
        <Text className="mt-1 text-[25px] font-extrabold leading-[31px] text-white">{greeting()}, {me?.first_name}</Text>
        <View className="mt-3 flex-row items-center gap-2 self-start rounded-full bg-white/15 px-3 py-1.5">
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: dot }} />
          <Text className="text-[12.5px] font-bold text-white">{statusLabel}</Text>
        </View>
      </LinearGradient>

      {/* Notices */}
      <View className="mt-3">
        {!online ? <Alert tone="warn">You're offline. Attendance needs an internet connection.</Alert> : null}
        {nonWorking ? <Alert tone="success">Attendance is not required today. {nonWorking}</Alert> : null}
        {needsFace ? (
          <Alert tone="warn">Set up face verification to mark attendance.{' '}
            <Link href="/face" className="font-bold text-navy">Set up now →</Link></Alert>
        ) : wrongDevice ? (
          <Alert tone="error">This is not your registered attendance device. Use the phone you set up Face ID on, or ask an administrator to reset your device.</Alert>
        ) : needsDevice ? (
          <Alert tone="warn">Set up face verification on this phone before marking attendance.{' '}
            <Link href="/face" className="font-bold text-navy">Set up now →</Link></Alert>
        ) : null}
        {me?.mfa_enabled && !me?.mfa_configured ? (
          <Alert tone="warn">Authenticator MFA is required for your account.{' '}
            <Link href="/device" className="font-bold text-navy">Set it up now →</Link></Alert>
        ) : null}
        {success ? <Alert tone="success"><Text className="text-[16px] font-extrabold">✓ {success}</Text></Alert> : null}
        {err ? <Alert tone="error">{err.message}</Alert> : null}
      </View>

      {/* Primary action */}
      <View className="items-center py-2">
        {state === 'not_checked_in' && !nonWorking && (
          <ActionButton kind="in" busyLabel={busy} icon="scan-outline" disabled={needsFace || needsDevice || !checkinOpen} onPress={() => startFace('check-in')} />
        )}
        {state === 'not_checked_in' && nonWorking ? (
          <View className="items-center py-8"><Icon name="business-outline" size={44} color={colors.green} /><Text className="mt-2 text-[16px] font-bold text-brand-green">Office closed today</Text></View>
        ) : null}
        {state === 'checked_in' && <ActionButton kind="out" busyLabel={busy} disabled={!checkoutOpen || needsFace || needsDevice} onPress={() => { setErr(null); setSuccess(''); setSheet(true); }} />}
        {state === 'checked_out' && (
          <View className="items-center py-6">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-tint-green"><Icon name="checkmark-done" size={48} color={colors.green} /></View>
            <Text className="mt-3 text-[17px] font-extrabold text-brand-green">Attendance complete for today 🎉</Text>
          </View>
        )}
        {state === 'not_checked_in' && !nonWorking && !checkinOpen ? <Muted className="px-6 text-center">Check-in closed at {fmtHM(checkinClosesAfter)}. You are marked absent for today.</Muted> : null}
        {state === 'not_checked_in' && !nonWorking && checkinOpen ? <Muted className="px-6 text-center">Check-in closes at {fmtHM(checkinClosesAfter)}.</Muted> : null}
        {!needsFace && !needsDevice && state !== 'checked_out' && !nonWorking ? <Muted className="mt-1 px-6 text-center">You'll verify your face with the camera.</Muted> : null}
        {state === 'checked_in' && !checkoutOpen ? <Muted className="px-6 text-center">Check-out opens at {fmtHM(checkoutAfter)} (Africa/Lagos time).</Muted> : null}
      </View>

      {/* Today's summary */}
      <Card className="mt-3 p-1">
        <View className="flex-row flex-wrap">
          <Cell icon="log-in-outline" label="Check-in" value={fmtTime(rec?.check_in_at)} />
          <Cell icon="log-out-outline" label="Check-out" value={fmtTime(rec?.check_out_at)} />
          <Cell icon="timer-outline" label="Duration" value={dur(rec?.duration_minutes)} />
          <Cell icon="location-outline" label="Campus" value={rec?.campus_name ?? '—'} />
          <Cell icon="speedometer-outline" label="Status" value={rec ? (rec.check_in_status === 'late' ? 'Late' : 'On time') : '—'}
            valueClass={rec ? (rec.check_in_status === 'late' ? 'text-brand-red' : 'text-brand-green') : undefined} />
          <Cell icon="list-outline" label="Activities" value={String(rec?.activity_count ?? 0)} />
        </View>
      </Card>

      <ActivitySheet visible={sheet} busy={!!busy} error={err?.message} onClose={() => setSheet(false)} onSubmit={() => { setSheet(false); startFace('check-out'); }} />

      <FaceCapture visible={!!faceAction} mode="verify" action={faceAction ?? undefined} onClose={() => setFaceAction(null)}
        onComplete={(id) => { const kind = faceAction; setFaceAction(null); if (kind) void attend(kind, id); }} />
    </Screen>
  );
}

function Cell({ icon, label, value, valueClass = 'text-ink' }: { icon: IconName; label: string; value: string; valueClass?: string }) {
  return (
    <View className="w-1/2 flex-row items-center gap-3 p-3">
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-navy-50"><Icon name={icon} size={18} color={colors.navy} /></View>
      <View className="flex-1">
        <Text className="text-[11.5px] font-semibold text-ink-muted">{label}</Text>
        <Text numberOfLines={1} className={`text-[15.5px] font-extrabold ${valueClass}`}>{value}</Text>
      </View>
    </View>
  );
}
