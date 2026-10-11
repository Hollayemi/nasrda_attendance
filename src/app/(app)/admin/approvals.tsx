import { useState } from 'react';
import { Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, ButtonRow, ChipTabs, DateField, EmptyState, Loading, Pill, Screen, Sheet, TextField } from '@/components/ui';
import { api, errorOf } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fmtDateTime, fmtDay, titleCase, todayISO } from '@/lib/format';
import { shadow } from '@/theme';
import { RequirePerm } from '@/hooks/useRequire';

type Tab = 'leave' | 'official-duty' | 'review' | 'devices' | 'department-review';
type RecallTarget = { id: number; kind: 'leave' | 'official-duty'; staff: string; endDate: string };
const TABS: [Tab, string][] = [['leave', 'Leave'], ['official-duty', 'Official duty'], ['review', 'Flagged'], ['devices', 'Devices'], ['department-review', 'Department']];

const listUrl: Record<Tab, string> = {
  leave: '/admin/leave/?include_active=true', 'official-duty': '/admin/official-duty/?include_active=true',
  review: '/admin/review-queue/', devices: '/admin/device-removals/', 'department-review': '/admin/department-review/',
};

export default function Approvals() {
  return <RequirePerm perm="can_access_approvals"><Inner /></RequirePerm>;
}

function Inner() {
  const { me } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>(me?.can_approve ? 'leave' : me?.can_review_department_requests ? 'department-review' : 'devices');
  const [recall, setRecall] = useState<RecallTarget | null>(null);
  const [returnDate, setReturnDate] = useState(todayISO());
  const [reason, setReason] = useState('');
  const [recallErr, setRecallErr] = useState('');
  const [actionErr, setActionErr] = useState('');

  const tabs = TABS.filter(([k]) => (k === 'devices' ? me?.can_manage_devices : k === 'department-review' ? !!me?.can_review_department_requests && !me?.can_approve : me?.can_approve));
  const { data = [], isLoading, refetch, isRefetching } = useQuery({ queryKey: [tab], queryFn: () => api.get(listUrl[tab]).then((r) => r.data as any[]) });

  const decide = useMutation({
    mutationFn: ({ id, decision, type }: { id: number; decision: string; type?: string }) => {
      const url = tab === 'leave' ? `/admin/leave/${id}/decide/` : tab === 'official-duty' ? `/admin/official-duty/${id}/decide/`
        : tab === 'review' ? `/admin/review-queue/${id}/decide/` : tab === 'department-review' ? `/admin/department-review/${type}/${id}/decide/` : `/admin/device-removals/${id}/decide/`;
      return api.post(url, { decision });
    },
    onSuccess: () => { setActionErr(''); qc.invalidateQueries({ queryKey: [tab] }); },
    onError: (e) => setActionErr(errorOf(e).message),
  });
  const doRecall = useMutation({
    mutationFn: () => api.post(`/admin/${recall!.kind}/${recall!.id}/recall/`, { return_date: returnDate, reason: reason.trim() }),
    onSuccess: () => { setRecall(null); setReason(''); qc.invalidateQueries({ queryKey: [tab] }); },
    onError: (e) => setRecallErr(errorOf(e).message),
  });
  const openRecall = (item: any, kind: 'leave' | 'official-duty') => {
    setRecallErr(''); setReason(''); setReturnDate(todayISO());
    setRecall({ id: item.id, kind, staff: item.staff_name ?? item.staff, endDate: item.end_date });
  };

  const detail = (item: any) =>
    tab === 'leave' ? `${titleCase(item.kind)} · ${fmtDay(item.start_date)} → ${fmtDay(item.end_date)}`
    : tab === 'official-duty' ? `${item.location} · ${fmtDay(item.start_date)} → ${fmtDay(item.end_date)}`
    : tab === 'review' ? `${fmtDay(item.date)} · ${item.campus}`
    : tab === 'devices' ? `${item.device_label} · IPPIS ${item.ippis}`
    : item.detail;

  return (
    <View className="flex-1 bg-surface">
      <View className="pb-2 pt-1"><ChipTabs options={tabs.map(([value, label]) => ({ value, label }))} value={tab} onChange={(t) => { setTab(t); setActionErr(''); }} /></View>
      <Screen refreshing={isRefetching} onRefresh={() => void refetch()}>
        {actionErr ? <Alert tone="error">{actionErr}</Alert> : null}
        {isLoading ? <Loading /> : data.length === 0 ? <EmptyState icon="checkmark-done-circle-outline" title="Nothing pending here" subtitle="You're all caught up." /> : null}
        {data.map((item) => {
          const recallable = tab === 'leave' || tab === 'official-duty' ? item.status === 'approved' : !!item.recallable;
          const kind = tab === 'official-duty' || item.type === 'official-duty' ? 'official-duty' : 'leave';
          const isReview = tab === 'review';
          return (
            <View key={`${item.type ?? tab}-${item.id}`} style={shadow} className="my-1.5 rounded-2xl bg-white p-4">
              <View className="flex-row items-start justify-between gap-2">
                <Text className="flex-1 text-[16px] font-extrabold text-ink">{item.staff_name ?? item.staff}</Text>
                {item.type ? <Pill label={titleCase(item.type).toUpperCase()} tone="navy" /> : null}
                {recallable && (tab === 'leave' || tab === 'official-duty') ? <Pill label="ACTIVE" tone="green" /> : null}
              </View>
              <Text className="mt-1 text-[13px] leading-[19px] text-ink-muted">{detail(item)}</Text>
              {item.reason ? <Text className="mt-1.5 text-[13.5px] leading-[19px] text-ink">{item.reason}</Text> : null}
              {isReview && item.flags?.length ? <Text className="mt-1.5 text-[13px] font-semibold text-brand-red">Flags: {item.flags.map((f: string) => titleCase(f)).join(', ')}</Text> : null}
              {tab === 'devices' ? <Text className="mt-1 text-[12.5px] text-ink-muted">Requested {fmtDateTime(item.requested_at)}</Text> : null}
              <View className="mt-3">
                {recallable ? (
                  <Button variant="secondary" size="sm" icon="return-up-back-outline" title="Recall from duty" onPress={() => openRecall(item, kind)} />
                ) : (
                  <ButtonRow>
                    <Button variant="success" size="sm" icon="checkmark" loading={decide.isPending && decide.variables?.id === item.id} title={isReview ? 'Mark normal' : 'Approve'}
                      onPress={() => decide.mutate({ id: item.id, type: item.type, decision: isReview ? 'normal' : 'approved' })} />
                    <Button variant="danger" size="sm" icon={isReview ? 'flag-outline' : 'close'} title={isReview ? 'Flag for HR' : 'Reject'}
                      onPress={() => decide.mutate({ id: item.id, type: item.type, decision: isReview ? 'confirmed_issue' : 'rejected' })} />
                  </ButtonRow>
                )}
              </View>
            </View>
          );
        })}
      </Screen>

      <Sheet visible={!!recall} onClose={() => !doRecall.isPending && setRecall(null)} title={`Recall ${recall?.staff ?? ''}`} subtitle="Ends their approved absence early."
        footer={<ButtonRow><Button variant="secondary" title="Cancel" disabled={doRecall.isPending} onPress={() => setRecall(null)} />
          <Button title="Confirm recall" loading={doRecall.isPending} disabled={!returnDate || !reason.trim()} onPress={() => doRecall.mutate()} /></ButtonRow>}>
        <DateField label="Return-to-duty date" value={returnDate} minimumDate={todayISO()} maximumDate={recall?.endDate} onChange={setReturnDate} />
        <TextField label="Reason for recall" multiline value={reason} onChangeText={setReason} placeholder="Explain why the staff is being recalled" />
        {recallErr ? <Alert tone="error" className="mt-3">{recallErr}</Alert> : null}
      </Sheet>
    </View>
  );
}
