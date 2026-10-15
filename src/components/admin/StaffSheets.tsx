import { useState } from 'react';
import { Alert as NativeAlert, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Button, ButtonRow, Muted, MultiSelect, Pill, Select, Sheet, SwitchRow, TextField } from '@/components/ui';
import { api, errorOf } from '@/lib/api';
import { saveAndShare } from '@/lib/files';
import type { Department, Option, Staff } from '@/types';

const SAMPLE_CSV = `IPPIS Number,First Name,Last Name,Email,File Number,Middle Name,Phone,Department,Designation,Grade Level,Campus,Role
10000001,Amina,Bello,amina.bello@example.gov.ng,NASRDA/HR/001,,08000000000,Administration,Administrative Officer,GL 08,Headquarters,Staff
`;

function useLookups() {
  const departments = useQuery({ queryKey: ['departments'], queryFn: () => api.get('/admin/departments/').then((r) => r.data as Department[]) });
  const campuses = useQuery({ queryKey: ['campuses'], queryFn: () => api.get('/admin/campuses/').then((r) => r.data as Option[]) });
  const roles = useQuery({ queryKey: ['roles'], queryFn: () => api.get('/admin/roles/').then((r) => r.data as Option[]) });
  return { departments: departments.data ?? [], campuses: campuses.data ?? [], roles: roles.data ?? [] };
}
const byCampus = (deps: Department[], campusId: string | number) => (!campusId ? deps : deps.filter((d) => d.campus_ids?.includes(Number(campusId))));

type Form = {
  ippis_number: string; file_number: string; first_name: string; middle_name: string; last_name: string; email: string; phone: string;
  department: number | ''; primary_campus: number | ''; campus_policy: string; designation: string; grade_level: string;
  employment_status: string; is_nursing_mother: boolean; mfa_enabled: boolean; role_ids: number[];
};
const blank: Form = { ippis_number: '', file_number: '', first_name: '', middle_name: '', last_name: '', email: '', phone: '', department: '', primary_campus: '', campus_policy: 'one', designation: '', grade_level: '', employment_status: 'permanent', is_nursing_mother: false, mfa_enabled: false, role_ids: [] };

function FormFields({ form, setForm }: { form: Form; setForm: (f: Form) => void }) {
  const { departments, campuses, roles } = useLookups();
  const t = (k: keyof Form) => (v: string) => setForm({ ...form, [k]: v });
  return (
    <>
      <TextField label="IPPIS number" hint="This is the staff member's login ID. It must be unique." value={form.ippis_number} onChangeText={t('ippis_number')} keyboardType="number-pad" />
      <TextField label="File number" value={form.file_number} onChangeText={t('file_number')} autoCapitalize="characters" />
      <View className="flex-row gap-3">
        <TextField className="flex-1" label="First name" value={form.first_name} onChangeText={t('first_name')} />
        <TextField className="flex-1" label="Last name" value={form.last_name} onChangeText={t('last_name')} />
      </View>
      <TextField label="Middle name" value={form.middle_name} onChangeText={t('middle_name')} />
      <TextField label="Email" value={form.email} onChangeText={t('email')} keyboardType="email-address" autoCapitalize="none" />
      <TextField label="Phone" value={form.phone} onChangeText={t('phone')} keyboardType="phone-pad" />
      <Select label="Primary campus" value={form.primary_campus} onChange={(v) => setForm({ ...form, primary_campus: v, department: '' })} placeholder="— None —" options={campuses.map((c) => ({ value: c.id, label: c.name }))} />
      <Select label="Department" value={form.department} onChange={(v) => setForm({ ...form, department: v })} disabled={!form.primary_campus}
        placeholder={form.primary_campus ? '— Select department —' : '— Select campus first —'} options={byCampus(departments, form.primary_campus).map((d) => ({ value: d.id, label: d.name }))} />
      <Select label="Campus policy" value={form.campus_policy} onChange={t('campus_policy')} options={[{ value: 'one', label: 'One campus only' }, { value: 'approved', label: 'Approved campuses' }, { value: 'any', label: 'Any NASRDA campus' }]} />
      <View className="flex-row gap-3">
        <TextField className="flex-1" label="Designation" value={form.designation} onChangeText={t('designation')} />
        <TextField className="flex-1" label="Grade level" value={form.grade_level} onChangeText={t('grade_level')} />
      </View>
      <Select label="Employment status" value={form.employment_status} onChange={t('employment_status')} options={[{ value: 'permanent', label: 'Permanent' }, { value: 'contract', label: 'Contract' }, { value: 'nysc', label: 'NYSC' }, { value: 'secondment', label: 'Secondment' }]} />
      <MultiSelect label="Roles" value={form.role_ids} onChange={(v) => setForm({ ...form, role_ids: v })} options={roles.map((r) => ({ value: r.id, label: r.name }))} />
      <SwitchRow label="Nursing mother" hint="Eligible for the configured early check-out time" value={form.is_nursing_mother} onChange={(v) => setForm({ ...form, is_nursing_mother: v })} />
      <SwitchRow label="Require authenticator MFA" hint="Asked for a code at every sign-in" value={form.mfa_enabled} onChange={(v) => setForm({ ...form, mfa_enabled: v })} />
    </>
  );
}

function TempPassword({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <View className="mt-2 rounded-xl bg-tint-amber p-3.5">
      <Text className="text-[13px] text-tint-amber-text">Temporary password (shown once only)</Text>
      <View className="mt-1 flex-row items-center justify-between">
        <Text selectable className="text-[20px] font-extrabold tracking-widest text-tint-amber-text">{value}</Text>
        <Button size="sm" variant="secondary" icon={copied ? 'checkmark' : 'copy-outline'} title={copied ? 'Copied' : 'Copy'} onPress={async () => { await Clipboard.setStringAsync(value); setCopied(true); }} />
      </View>
    </View>
  );
}

export function NewStaffSheet({ visible, onClose, onDone }: { visible: boolean; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState<Form>(blank);
  const [msg, setMsg] = useState('');
  const [temp, setTemp] = useState('');
  const create = useMutation({
    mutationFn: () => api.post('/admin/staff/', { ...form, department: form.department || null, primary_campus: form.primary_campus || null }),
    onSuccess: ({ data }) => { setTemp(data.temporary_password); setMsg(data.email_sent ? 'Staff member created and their sign-in details were emailed.' : 'Staff member created. Give them this temporary password securely.'); onDone(); },
    onError: (e) => setMsg(errorOf(e).message),
  });
  const close = () => { setForm(blank); setMsg(''); setTemp(''); onClose(); };
  return (
    <Sheet visible={visible} onClose={close} tall title="Add staff member"
      footer={temp ? <Button title="Close" onPress={close} /> : <Button title="Create staff" loading={create.isPending} disabled={!form.ippis_number || !form.first_name || !form.last_name || !form.email} onPress={() => create.mutate()} />}>
      {temp ? <><Alert tone="success">{msg}</Alert><TempPassword value={temp} /></> : (
        <>
          <FormFields form={form} setForm={setForm} />
          {msg ? <Alert tone="error" className="mt-3">{msg}</Alert> : null}
        </>
      )}
    </Sheet>
  );
}

export function EditStaffSheet({ staff, onClose, onSaved }: { staff: Staff | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Form>(blank);
  const [loadedId, setLoadedId] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [temp, setTemp] = useState('');
  // (Re)initialise the form whenever a different staff member is opened.
  if (staff && staff.id !== loadedId) {
    setLoadedId(staff.id); setMsg(null); setTemp('');
    setForm({
      ippis_number: staff.ippis_number, file_number: staff.file_number ?? '', first_name: staff.first_name, middle_name: staff.middle_name ?? '', last_name: staff.last_name,
      email: staff.email, phone: staff.phone ?? '', department: staff.department ?? '', primary_campus: staff.primary_campus ?? '', campus_policy: staff.campus_policy,
      designation: staff.designation ?? '', grade_level: staff.grade_level ?? '', employment_status: staff.employment_status, is_nursing_mother: staff.is_nursing_mother ?? false,
      mfa_enabled: staff.mfa_enabled ?? false, role_ids: staff.role_ids ?? [],
    });
  }
  const close = () => { setLoadedId(null); onClose(); };

  const save = useMutation({
    mutationFn: () => api.patch(`/admin/staff/${staff!.id}/`, { ...form, department: form.department || null, primary_campus: form.primary_campus || null }),
    onSuccess: () => { onSaved(); close(); },
    onError: (e) => setMsg({ ok: false, text: errorOf(e).message }),
  });
  const resetPassword = useMutation({
    mutationFn: () => api.post(`/admin/staff/${staff!.id}/reset_password/`).then((r) => r.data),
    onSuccess: (d) => { setTemp(d.temporary_password); setMsg({ ok: true, text: d.email_sent ? 'New temporary password generated and emailed to the staff member.' : 'New temporary password generated — hand it to the staff member directly.' }); },
    onError: (e) => setMsg({ ok: false, text: errorOf(e).message }),
  });
  const resetDevices = useMutation({
    mutationFn: () => api.post(`/admin/staff/${staff!.id}/reset_devices/`).then((r) => r.data),
    onSuccess: (d) => setMsg({ ok: true, text: `${d.revoked} device(s) revoked.` }),
    onError: (e) => setMsg({ ok: false, text: errorOf(e).message }),
  });
  const toggle = useMutation({
    mutationFn: () => api.post(`/admin/staff/${staff!.id}/${staff!.is_active ? 'deactivate' : 'activate'}/`),
    onSuccess: () => { onSaved(); close(); },
    onError: (e) => setMsg({ ok: false, text: errorOf(e).message }),
  });

  const confirm = (title: string, body: string, ok: string, fn: () => void, destructive = true) =>
    NativeAlert.alert(title, body, [{ text: 'Cancel', style: 'cancel' }, { text: ok, style: destructive ? 'destructive' : 'default', onPress: fn }]);

  return (
    <Sheet visible={!!staff} onClose={close} tall title={`Edit staff`} subtitle={staff ? `${staff.first_name} ${staff.last_name} · ${staff.ippis_number}` : undefined}
      footer={<Button title="Save changes" loading={save.isPending} onPress={() => save.mutate()} />}>
      {staff ? <View className="mb-1 flex-row"><Pill label={staff.is_active ? 'ACTIVE' : 'INACTIVE'} tone={staff.is_active ? 'green' : 'gray'} /></View> : null}
      <FormFields form={form} setForm={setForm} />
      {msg ? <Alert tone={msg.ok ? 'success' : 'error'} className="mt-3">{msg.text}</Alert> : null}
      {temp ? <TempPassword value={temp} /> : null}

      <Text className="mb-1 mt-6 text-[13px] font-bold uppercase tracking-wider text-ink-muted">Account actions</Text>
      <ButtonRow>
        <Button variant="secondary" size="sm" icon="key-outline" title="Reset password" loading={resetPassword.isPending}
          onPress={() => confirm('Reset password?', `Generate a new temporary password for ${staff?.first_name}?`, 'Reset', () => resetPassword.mutate(), false)} />
        <Button variant="secondary" size="sm" icon="phone-portrait-outline" title="Reset devices" loading={resetDevices.isPending}
          onPress={() => confirm('Reset devices?', `Revoke all of ${staff?.first_name}'s approved phones? They'll need to set up face verification on a phone again to check in.`, 'Revoke', () => resetDevices.mutate())} />
      </ButtonRow>
      <Button className="mt-2.5" variant={staff?.is_active ? 'danger' : 'success'} icon={staff?.is_active ? 'person-remove-outline' : 'person-add-outline'}
        title={staff?.is_active ? 'Deactivate staff' : 'Activate staff'} loading={toggle.isPending}
        onPress={() => confirm(staff?.is_active ? 'Deactivate staff?' : 'Activate staff?', `${staff?.first_name} ${staff?.last_name}`, staff?.is_active ? 'Deactivate' : 'Activate', () => toggle.mutate(), !!staff?.is_active)} />
    </Sheet>
  );
}

export function ImportSheet({ visible, onClose, onDone }: { visible: boolean; onClose: () => void; onDone: () => void }) {
  const [preview, setPreview] = useState<any | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const close = () => { setPreview(null); setMsg(null); onClose(); };

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: ['text/csv', 'text/comma-separated-values', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', '*/*'] });
    if (res.canceled) return;
    const a = res.assets[0];
    setBusy(true); setMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', { uri: a.uri, name: a.name, type: a.mimeType ?? 'text/csv' } as any);
      setPreview((await api.post('/admin/staff/import/preview/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data);
    } catch (e) { setMsg({ ok: false, text: errorOf(e).message }); } finally { setBusy(false); }
  };
  const commit = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/admin/staff/import/commit/', { token: preview.token });
      setMsg({ ok: true, text: `Imported ${data.created} staff.` }); setPreview(null); onDone();
    } catch (e) { setMsg({ ok: false, text: errorOf(e).message }); } finally { setBusy(false); }
  };

  return (
    <Sheet visible={visible} onClose={close} tall title="Bulk import staff" subtitle="Upload a CSV or Excel file with staff information."
      footer={preview ? <Button title={`Import ${preview.valid} valid row(s)`} loading={busy} disabled={preview.valid === 0} onPress={commit} /> : undefined}>
      {!preview ? (
        <>
          <Button className="mt-2" icon="cloud-upload-outline" title="Choose CSV or Excel file" loading={busy} onPress={pick} />
          <Button className="mt-2.5" variant="secondary" icon="download-outline" title="Share sample CSV template" onPress={() => saveAndShare('staff-import-sample.csv', SAMPLE_CSV, 'text/csv')} />
          <Muted className="mt-3">The template includes an optional Phone column. Rows are checked first, and nothing is saved until you confirm.</Muted>
        </>
      ) : (
        <>
          <View className="mt-1 flex-row gap-2">
            <Pill label={`${preview.valid} VALID`} tone="green" /><Pill label={`${preview.invalid} INVALID`} tone={preview.invalid ? 'red' : 'gray'} /><Pill label={`${preview.total} ROWS`} tone="navy" />
          </View>
          {preview.rows.map((r: any, i: number) => (
            <View key={i} className={`my-1 rounded-xl p-3 ${r.valid ? 'bg-white' : 'bg-tint-red'}`}>
              <Text className="text-[14px] font-bold text-ink">{r.first_name} {r.last_name} <Text className="font-normal text-ink-muted">· {r.ippis_number}</Text></Text>
              <Text className="text-[12px] text-ink-muted">{r.email} · {r.role || 'No role'}</Text>
              {r.errors?.length ? <Text className="mt-1 text-[12.5px] font-semibold text-tint-red-text">{r.errors.join('; ')}</Text> : null}
            </View>
          ))}
          <Button className="mt-2" variant="secondary" size="sm" title="Choose a different file" onPress={() => setPreview(null)} />
        </>
      )}
      {msg ? <Alert tone={msg.ok ? 'success' : 'error'} className="mt-3">{msg.text}</Alert> : null}
    </Sheet>
  );
}
