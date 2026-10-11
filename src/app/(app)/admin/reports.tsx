import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, DateField, Icon, Muted, Screen, Segmented, Select } from '@/components/ui';
import { RequirePerm } from '@/hooks/useRequire';
import { api, errorOf } from '@/lib/api';
import { saveAndShare } from '@/lib/files';
import { fmtDay, fmtMonth, shiftMonth, thisMonth, todayISO } from '@/lib/format';
import { colors } from '@/theme';

type Scope = { all_access: boolean; campuses: { id: number; name: string }[]; departments: { id: number; name: string; campus_ids?: number[] }[] };
const MIME = { csv: 'text/csv', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pdf: 'application/pdf' } as const;
const safe = (v: string) => v.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');

export default function Reports() {
  return <RequirePerm perm="can_export_reports"><Inner /></RequirePerm>;
}

function Inner() {
  const [report, setReport] = useState<'daily' | 'monthly'>('daily');
  const [format, setFormat] = useState<keyof typeof MIME>('xlsx');
  const [date, setDate] = useState(todayISO());
  const [month, setMonth] = useState(thisMonth());
  const [campus, setCampus] = useState<number | ''>('');
  const [department, setDepartment] = useState<number | ''>('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const { data: scope } = useQuery({ queryKey: ['report-scope'], queryFn: () => api.get('/reports/scope/').then((r) => r.data as Scope) });
  const campuses = scope?.campuses ?? [];
  const departments = scope?.departments ?? [];
  const restricted = scope?.all_access === false;
  const selCampus = restricted ? (campuses[0]?.id ?? '') : campus;
  const selDept = restricted ? (departments[0]?.id ?? '') : department;
  const availableDeps = selCampus ? departments.filter((d) => d.campus_ids?.includes(Number(selCampus))) : departments;

  const download = async () => {
    setBusy(true); setMsg(null);
    try {
      const params: Record<string, string> = { report, output_format: format, ...(report === 'monthly' ? { month } : { date }) };
      if (selCampus) params.campus = String(selCampus);
      if (selDept) params.department = String(selDept);
      const res = await api.get('/reports/export/', { params, responseType: 'arraybuffer' });
      const period = report === 'monthly' ? fmtMonth(month).replace(/\s+/g, '-') : fmtDay(date).replace(/\s+/g, '-');
      const name = `${report === 'monthly' ? 'monthly-attendance-summary' : 'daily-attendance'}-${safe(campuses.find((c) => c.id === Number(selCampus))?.name ?? 'All-Campuses')}-${safe(departments.find((d) => d.id === Number(selDept))?.name ?? 'All-Departments')}-${period}.${format}`;
      await saveAndShare(name, new Uint8Array(res.data), MIME[format]);
      setMsg({ ok: true, text: 'Report ready. Choose where to save or send it.' });
    } catch (e: any) {
      // With an arraybuffer response, API errors arrive as bytes; decode them to show the real message.
      const raw = e?.response?.data;
      if (raw instanceof ArrayBuffer) {
        try { const p = JSON.parse(new TextDecoder().decode(raw)); setMsg({ ok: false, text: p.message ?? p.detail ?? 'Could not generate the report.' }); }
        catch { setMsg({ ok: false, text: 'Could not generate the report. Please try again.' }); }
      } else setMsg({ ok: false, text: errorOf(e).message });
    } finally { setBusy(false); }
  };

  const isCurrent = month === thisMonth();
  return (
    <Screen>
      <Card className="mt-2">
        <Segmented value={report} onChange={setReport} options={[{ value: 'daily', label: 'Daily attendance' }, { value: 'monthly', label: 'Monthly summary' }]} />
        {report === 'daily' ? (
          <DateField label="Date" value={date} onChange={setDate} />
        ) : (
          <View className="mt-3">
            <Text className="mb-1.5 text-[13px] font-semibold text-ink">Month</Text>
            <View className="min-h-[50px] flex-row items-center justify-between rounded-xl border border-surface-input bg-white px-1.5">
              <Pressable onPress={() => setMonth(shiftMonth(month, -1))} hitSlop={8} className="h-10 w-10 items-center justify-center"><Icon name="chevron-back" size={20} color={colors.navy} /></Pressable>
              <Text className="text-[16px] font-bold text-ink">{fmtMonth(month)}</Text>
              <Pressable disabled={isCurrent} onPress={() => setMonth(shiftMonth(month, 1))} hitSlop={8} className={`h-10 w-10 items-center justify-center ${isCurrent ? 'opacity-30' : ''}`}><Icon name="chevron-forward" size={20} color={colors.navy} /></Pressable>
            </View>
          </View>
        )}
        <Select label="Campus" value={selCampus} disabled={restricted} placeholder="All campuses" onChange={(v) => { setCampus(v); setDepartment(''); }}
          options={[{ value: '' as any, label: 'All campuses' }, ...campuses.map((c) => ({ value: c.id, label: c.name }))]} />
        <Select label="Department" value={selDept} disabled={restricted} placeholder="All departments" onChange={setDepartment}
          options={[{ value: '' as any, label: 'All departments' }, ...availableDeps.map((d) => ({ value: d.id, label: d.name }))]} />
        <Muted className="mt-2">{restricted ? 'Directors can generate reports only for their assigned campus and department.' : 'Pick a campus to limit the department list, or leave either on All.'}</Muted>
        <Select label="Format" value={format} onChange={setFormat} options={[{ value: 'xlsx', label: 'Excel (.xlsx)' }, { value: 'csv', label: 'CSV' }, { value: 'pdf', label: 'PDF' }]} />
        {msg ? <Alert tone={msg.ok ? 'success' : 'error'} className="mt-3">{msg.text}</Alert> : null}
        <Button className="mt-4" icon="download-outline" title={busy ? 'Generating…' : 'Generate report'} loading={busy} onPress={download} />
      </Card>
    </Screen>
  );
}
