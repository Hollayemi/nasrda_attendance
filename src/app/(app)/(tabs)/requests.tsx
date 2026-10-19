import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, DateField, EmptyState, ListRow, Muted, Pill, Screen, Segmented, Select, Sheet, ShowMore, TextField, approvalLabel, approvalTone } from '@/components/ui';
import { api, errorOf } from '@/lib/api';
import { fmtDay, titleCase } from '@/lib/format';
import type { StaffRequest } from '@/types';

type Tab = 'leave' | 'duty' | 'recurring';
const LEAVE_TYPES = [['annual', 'Annual leave'], ['sick', 'Sick leave'], ['casual', 'Casual leave'], ['maternity', 'Maternity leave'], ['paternity', 'Paternity leave'], ['training', 'Training'], ['study', 'Study leave'], ['conference', 'Conference'], ['official_travel', 'Official travel'], ['permission', 'Permission'], ['other', 'Other']] as const;
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const PAGE = 5;
const blankLeave = { kind: 'annual', start_date: '', end_date: '', reason: '' };
const blankDuty = { location: '', start_date: '', end_date: '', reason: '' };
const blankRecurring = { start_date: '', end_date: '', off_weekdays: [] as number[], reason: '' };

export default function Requests() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('leave');
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState(false);
  const [leave, setLeave] = useState(blankLeave);
  const [duty, setDuty] = useState(blankDuty);
  const [recurring, setRecurring] = useState(blankRecurring);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [formErr, setFormErr] = useState('');

  const endpoint = tab === 'leave' ? '/staff/leave/' : tab === 'duty' ? '/staff/official-duty/' : '/staff/recurring-leave/';
  const { data: requests = [], refetch, isRefetching } = useQuery({ queryKey: ['requests', tab], queryFn: () => api.get(endpoint).then((r) => r.data as StaffRequest[]) });

  const form = tab === 'leave' ? leave : tab === 'duty' ? duty : recurring;
  const patch = (k: string, v: string) => (tab === 'leave' ? setLeave({ ...leave, [k]: v }) : tab === 'duty' ? setDuty({ ...duty, [k]: v }) : setRecurring({ ...recurring, [k]: v }));
  const toggleDay = (day: number) => setRecurring((cur) => ({ ...cur, off_weekdays: cur.off_weekdays.includes(day) ? cur.off_weekdays.filter((d) => d !== day) : [...cur.off_weekdays, day].sort() }));
  const ready = !!form.start_date && !!form.end_date && (tab === 'leave' || (tab === 'duty' ? !!duty.location.trim() : recurring.off_weekdays.length > 0));

  const submit = useMutation({
    mutationFn: () => api.post(endpoint, form),
    onSuccess: () => {
      setMsg({ ok: true, text: `${tab === 'leave' ? 'Leave' : tab === 'duty' ? 'Official-duty' : 'Recurring leave'} request submitted and is awaiting your Director's approval.` });
      setShown(PAGE); setOpen(false); setFormErr('');
      if (tab === 'leave') setLeave(blankLeave); else if (tab === 'duty') setDuty(blankDuty); else setRecurring(blankRecurring);
      qc.invalidateQueries({ queryKey: ['requests', tab] });
    },
    onError: (e) => setFormErr(errorOf(e).message),
  });

  const switchTab = (t: Tab) => { setTab(t); setShown(PAGE); setMsg(null); };
  const noun = tab === 'leave' ? 'leave' : tab === 'duty' ? 'official-duty' : 'recurring leave';
  const heading = tab === 'leave' ? 'Request leave' : tab === 'duty' ? 'Request official duty' : 'Request recurring leave';

  return (
    <Screen title="Requests" subtitle="Submit leave, official-duty or recurring part-time leave requests and follow their approval." refreshing={isRefetching} onRefresh={() => void refetch()}>
      <View className="mt-3"><Segmented value={tab} onChange={switchTab} options={[{ value: 'leave', label: 'Leave' }, { value: 'duty', label: 'Official duty' }, { value: 'recurring', label: 'Recurring' }]} /></View>
      <Button className="mt-3" icon="add-circle-outline" title={heading} onPress={() => { setFormErr(''); setMsg(null); setOpen(true); }} />
      {msg ? <Alert tone={msg.ok ? 'success' : 'error'} className="mt-3">{msg.text}</Alert> : null}

      <Text className="mb-1 mt-5 text-[13px] font-bold uppercase tracking-wider text-ink-muted">Your {noun} {tab === 'recurring' ? 'schedules' : 'requests'}</Text>
      {requests.length === 0 ? <EmptyState icon="paper-plane-outline" title="No requests yet" subtitle="Requests you submit will show their approval progress here." /> : (
        <>
          {requests.slice(0, shown).map((r) => (
            <View key={r.id} className="my-1 rounded-2xl bg-white p-3.5" style={{ elevation: 2, shadowColor: '#0B2A4A', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1">
                  <Text className="text-[15.5px] font-extrabold text-ink">{tab === 'leave' ? titleCase(r.kind ?? '') : tab === 'duty' ? r.location : `Off: ${(r.off_weekdays ?? []).map((d) => WEEKDAYS[d]).join(', ')}`}</Text>
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

      <Sheet visible={open} onClose={() => !submit.isPending && setOpen(false)} title={heading}
        subtitle="Goes to your Director first, then the Administrator."
        footer={<Button title={submit.isPending ? 'Submitting…' : 'Submit request'} loading={submit.isPending} disabled={!ready} onPress={() => submit.mutate()} />}>
        {tab === 'leave' ? (
          <Select label="Leave type" value={leave.kind} onChange={(v) => patch('kind', String(v))} options={LEAVE_TYPES.map(([value, label]) => ({ value, label }))} />
        ) : tab === 'duty' ? (
          <TextField label="Duty location" value={duty.location} onChangeText={(v) => patch('location', v)} placeholder="e.g. Abuja field site" />
        ) : (
          <View className="mt-3">
            <Text className="text-[13px] font-semibold text-ink">Weekly off days</Text>
            <Muted className="mb-2 mt-0.5">Select every day you will be off during this approved arrangement.</Muted>
            <View className="flex-row flex-wrap gap-2">
              {WEEKDAYS.map((day, i) => {
                const on = recurring.off_weekdays.includes(i);
                return (
                  <Pressable key={day} onPress={() => toggleDay(i)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                    className={`rounded-full border px-3.5 py-2 active:opacity-70 ${on ? 'border-navy bg-navy' : 'border-surface-input bg-white'}`}>
                    <Text className={`text-[13.5px] font-bold ${on ? 'text-white' : 'text-ink'}`}>{day}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
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
