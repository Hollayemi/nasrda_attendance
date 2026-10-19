import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, DateField, Loading, Muted, Screen, SwitchRow, TextField } from '@/components/ui';
import { RequirePerm } from '@/hooks/useRequire';
import { api, errorOf } from '@/lib/api';
import type { Settings } from '@/types';

export default function SettingsScreen() {
  return <RequirePerm perm="can_manage_roles"><Inner /></RequirePerm>;
}

const hm = (v?: string) => (v ?? '').slice(0, 5);

function Inner() {
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/admin/settings/').then((r) => r.data as Settings) });
  const [form, setForm] = useState<Settings | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (data) setForm(data); }, [data]);
  if (isLoading || !form) return <Screen><Loading label="Loading settings…" /></Screen>;

  const time = (k: keyof Settings, label: string, hint?: string) => (
    <DateField label={label} hint={hint} mode="time" value={hm(form[k] as string)} onChange={(v) => setForm({ ...form, [k]: v })} />
  );
  const num = (k: keyof Settings, label: string, className = '') => (
    <TextField className={className} label={label} keyboardType="numeric" value={String(form[k])} onChangeText={(v) => setForm({ ...form, [k]: Number(v.replace(/[^0-9.]/g, '')) })} />
  );
  const save = async () => {
    setSaving(true); setMsg(null);
    try { const { data: saved } = await api.patch('/admin/settings/', form); setForm(saved); setMsg({ ok: true, text: 'System settings saved.' }); }
    catch (e) { setMsg({ ok: false, text: errorOf(e).message }); }
    finally { setSaving(false); }
  };

  return (
    <Screen>
      <Muted className="mt-1">Changes take effect immediately across attendance, location checks, and face-verification security.</Muted>
      <Card className="mt-3">
        <Text className="text-[17px] font-extrabold text-ink">Working hours</Text>
        <View className="flex-row gap-3">
          <View className="flex-1">{time('work_start', 'Work starts')}</View>
          <View className="flex-1">{time('work_end', 'Work ends')}</View>
        </View>
        {time('checkin_late_after', 'Late check-in starts at', 'Staff who check in from this time until check-in closes are marked late.')}
        {time('checkin_closes_after', 'Check-in closes at', 'After this, check-in is disabled and staff without an approved exception are counted absent.')}
        {time('checkout_allowed_after', 'Check-out available from')}
        {time('nursing_mother_checkout_after', 'Nursing mother check-out from', 'Applies only to staff marked as a nursing mother.')}
        {num('overtime_after_minutes', 'Overtime begins after (minutes)')}
      </Card>
      <Card className="mt-3">
        <Text className="text-[17px] font-extrabold text-ink">Location validation</Text>
        <View className="flex-row gap-3">{num('min_accuracy_m', 'GPS accuracy (m)', 'flex-1')}{num('max_speed_mps', 'Max speed (m/s)', 'flex-1')}</View>
      </Card>
      <Card className="mt-3">
        <Text className="text-[17px] font-extrabold text-ink">Face and approved-device verification</Text>
        <SwitchRow label="Require face verification for attendance" hint="Staff must verify their face with the camera to check in or out." value={form.require_face_verification} onChange={(v) => setForm({ ...form, require_face_verification: v })} />
        <SwitchRow label="Require a registered device for attendance" hint="Attendance can only be recorded from the phone bound to the staff member's face verification." value={form.require_approved_device} onChange={(v) => setForm({ ...form, require_approved_device: v })} />
        {num('max_devices', 'Maximum approved devices per staff')}
      </Card>
      {msg ? <Alert tone={msg.ok ? 'success' : 'error'} className="mt-3">{msg.text}</Alert> : null}
      <Button className="mt-4" icon="save-outline" title="Save settings" loading={saving} onPress={save} />
    </Screen>
  );
}
