import { useState } from 'react';
import { Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, DateField, EmptyState, ListRow, Pill, Screen, Segmented, Select, Sheet, ShowMore, TextField, approvalLabel, approvalTone } from '@/components/ui';
import { api, errorOf } from '@/lib/api';
import { fmtDay, titleCase } from '@/lib/format';
import type { StaffRequest } from '@/types';

type Tab = 'leave' | 'duty';
const LEAVE_TYPES = [['annual', 'Annual leave'], ['sick', 'Sick leave'], ['casual', 'Casual leave'], ['maternity', 'Maternity leave'], ['paternity', 'Paternity leave'], ['training', 'Training'], ['study', 'Study leave'], ['conference', 'Conference'], ['official_travel', 'Official travel'], ['permission', 'Permission'], ['other', 'Other']] as const;
const PAGE = 5;
const blankLeave = { kind: 'annual', start_date: '', end_date: '', reason: '' };
const blankDuty = { location: '', start_date: '', end_date: '', reason: '' };

export default function Requests() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('leave');
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState(false);
  const [leave, setLeave] = useState(blankLeave);
  const [duty, setDuty] = useState(blankDuty);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [formErr, setFormErr] = useState('');

  const endpoint = tab === 'leave' ? '/staff/leave/' : '/staff/official-duty/';
  const { data: requests = [], refetch, isRefetching } = useQuery({ queryKey: ['requests', tab], queryFn: () => api.get(endpoint).then((r) => r.data as StaffRequest[]) });

  const form = tab === 'leave' ? leave : duty;
  const patch = (k: string, v: string) => (tab === 'leave' ? setLeave({ ...leave, [k]: v }) : setDuty({ ...duty, [k]: v }));
  const ready = !!form.start_date && !!form.end_date && (tab === 'leave' || !!duty.location.trim());

  const submit = useMutation({
    mutationFn: () => api.post(endpoint, form),
    onSuccess: () => {
      setMsg({ ok: true, text: `${tab === 'leave' ? 'Leave' : 'Official-duty'} request submitted and is awaiting your Director's approval.` });
      setShown(PAGE); setOpen(false); setFormErr('');
      tab === 'leave' ? setLeave(blankLeave) : setDuty(blankDuty);
      qc.invalidateQueries({ queryKey: ['requests', tab] });
    },
    onError: (e) => setFormErr(errorOf(e).message),
  });

  const switchTab = (t: Tab) => { setTab(t); setShown(PAGE); setMsg(null); };
  const noun = tab === 'leave' ? 'leave' : 'official-duty';

  return (
    <Screen title="Requests" subtitle="Submit leave or official-duty requests and follow their approval." refreshing={isRefetching} onRefresh={() => void refetch()}>
      <View className="mt-3"><Segmented value={tab} onChange={switchTab} options={[{ value: 'leave', label: 'Leave' }, { value: 'duty', label: 'Official duty' }]} /></View>
      <Button className="mt-3" icon="add-circle-outline" title={tab === 'leave' ? 'Request leave' : 'Request official duty'} onPress={() => { setFormErr(''); setMsg(null); setOpen(true); }} />
      {msg ? <Alert tone={msg.ok ? 'success' : 'error'} className="mt-3">{msg.text}</Alert> : null}

      <Text className="mb-1 mt-5 text-[13px] font-bold uppercase tracking-wider text-ink-muted">Your {noun} requests</Text>
      {requests.length === 0 ? <EmptyState icon="paper-plane-outline" title="No requests yet" subtitle="Requests you submit will show their approval progress here." /> : (
        <>
          {requests.slice(0, shown).map((r) => (
            <View key={r.id} className="my-1 rounded-2xl bg-white p-3.5" style={{ elevation: 2, shadowColor: '#0B2A4A', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1">
                  <Text className="text-[15.5px] font-extrabold text-ink">{tab === 'leave' ? titleCase(r.kind ?? '') : r.location}</Text>
                  <Text className="mt-0.5 text-[12.5px] text-ink-muted">{fmtDay(r.start_date)} → {fmtDay(r.end_date)}</Text>
                </View>
                <Pill label={approvalLabel(r.approval_state)} tone={approvalTone[r.approval_state]} />
              </View>
              {r.reason ? <Text className="mt-2 text-[13px] leading-[19px] text-ink">{r.reason}</Text> : null}
              <Text className={`mt-2 text-[12.5px] leading-[18px] ${r.approval_state === 'rejected' ? 'font-semibold text-brand-red' : r.approval_state === 'approved' ? 'font-semibold text-brand-green' : 'text-ink-muted'}`}>{r.approval_message}</Text>
            </View>
          ))}
          <ShowMore shown={shown} total={requests.length} onMore={() => setShown((n) => n + PAGE)} />
        </>
      )}

      <Sheet visible={open} onClose={() => !submit.isPending && setOpen(false)} title={tab === 'leave' ? 'Request leave' : 'Request official duty'}
        subtitle="Goes to your Director first, then the Administrator."
        footer={<Button title={submit.isPending ? 'Submitting…' : 'Submit request'} loading={submit.isPending} disabled={!ready} onPress={() => submit.mutate()} />}>
        {tab === 'leave' ? (
          <Select label="Leave type" value={leave.kind} onChange={(v) => patch('kind', String(v))} options={LEAVE_TYPES.map(([value, label]) => ({ value, label }))} />
        ) : (
          <TextField label="Duty location" value={duty.location} onChangeText={(v) => patch('location', v)} placeholder="e.g. Abuja field site" />
        )}
        <View className="flex-row gap-3">
          <DateField className="flex-1" label="Start date" value={form.start_date} onChange={(v) => patch('start_date', v)} />
          <DateField className="flex-1" label="End date" value={form.end_date} minimumDate={form.start_date || undefined} onChange={(v) => patch('end_date', v)} />
        </View>
        <TextField label="Reason" multiline value={form.reason} onChangeText={(v) => patch('reason', v)} />
        {formErr ? <Alert tone="error" className="mt-3">{formErr}</Alert> : null}
      </Sheet>
    </Screen>
  );
}
