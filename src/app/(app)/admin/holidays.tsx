import { useState } from 'react';
import { Alert as NativeAlert, Pressable, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, DateField, EmptyState, Icon, ListRow, Loading, Muted, Pill, Screen, Select, Sheet, TextField, type Tone } from '@/components/ui';
import { RequirePerm } from '@/hooks/useRequire';
import { api, errorOf } from '@/lib/api';
import { fmtDay } from '@/lib/format';
import type { Holiday } from '@/types';

const KINDS: [Holiday['kind'], string, Tone][] = [['public', 'Public holiday', 'navy'], ['nasrda', 'NASRDA holiday', 'navy'], ['non_working', 'Other non-working day', 'gray'], ['special_working', 'Special working day', 'green']];

export default function Holidays() {
  return <RequirePerm perm="can_manage_roles"><Inner /></RequirePerm>;
}

function Inner() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Holiday | 'new' | null>(null);
  const { data: holidays = [], isLoading, refetch, isRefetching } = useQuery({ queryKey: ['holidays'], queryFn: () => api.get('/admin/holidays/').then((r) => r.data as Holiday[]) });
  const remove = useMutation({ mutationFn: (id: number) => api.delete(`/admin/holidays/${id}/`), onSuccess: () => qc.invalidateQueries({ queryKey: ['holidays'] }) });
  const confirmDelete = (h: Holiday) => NativeAlert.alert('Delete holiday?', h.name, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(h.id) }]);

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refetch()}>
      <Muted className="mb-2 mt-1">Holidays and special days change who is expected to attend.</Muted>
      <Button icon="add" title="Add holiday" onPress={() => setEditing('new')} />
      <View className="mt-3">
        {isLoading ? <Loading /> : holidays.length === 0 ? <EmptyState icon="calendar-outline" title="No holiday dates yet" subtitle="Add public holidays and special working days." /> : null}
        {holidays.map((h) => {
          const k = KINDS.find(([v]) => v === h.kind);
          return (
            <ListRow key={h.id} icon="calendar-outline" title={h.name} subtitle={fmtDay(h.date)} onPress={() => setEditing(h)}
              right={<View className="flex-row items-center gap-2"><Pill label={(k?.[1] ?? h.kind).toUpperCase()} tone={k?.[2] ?? 'gray'} />
                <Pressable hitSlop={10} onPress={() => confirmDelete(h)} className="h-8 w-8 items-center justify-center rounded-full bg-tint-red active:opacity-70"><Icon name="trash-outline" size={15} color="#8E2B20" /></Pressable></View>} />
          );
        })}
      </View>
      <HolidaySheet holiday={editing} onClose={() => setEditing(null)} />
    </Screen>
  );
}

function HolidaySheet({ holiday, onClose }: { holiday: Holiday | 'new' | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ date: '', name: '', kind: 'public' as Holiday['kind'] });
  const [msg, setMsg] = useState('');
  const [loaded, setLoaded] = useState<Holiday | 'new' | null>(null);
  if (holiday && holiday !== loaded) {
    setLoaded(holiday); setMsg('');
    setForm(holiday === 'new' ? { date: '', name: '', kind: 'public' } : { date: holiday.date, name: holiday.name, kind: holiday.kind });
  }
  const close = () => { setLoaded(null); onClose(); };
  const save = useMutation({
    mutationFn: () => (holiday !== 'new' && holiday ? api.patch(`/admin/holidays/${holiday.id}/`, form) : api.post('/admin/holidays/', form)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['holidays'] }); close(); },
    onError: (e) => setMsg(errorOf(e).message),
  });
  return (
    <Sheet visible={!!holiday} onClose={close} title={holiday === 'new' ? 'Add holiday' : 'Edit holiday'}
      footer={<Button title="Save holiday" loading={save.isPending} disabled={!form.date || !form.name.trim()} onPress={() => save.mutate()} />}>
      <DateField label="Date" value={form.date} onChange={(date) => setForm({ ...form, date })} />
      <TextField label="Name" value={form.name} placeholder="e.g. Independence Day" onChangeText={(name) => setForm({ ...form, name })} />
      <Select label="Day type" value={form.kind} onChange={(kind) => setForm({ ...form, kind })} options={KINDS.map(([value, label]) => ({ value, label }))}
        hint="Special working days require normal attendance, even if they fall on a weekend or holiday." />
      {msg ? <Alert tone="error" className="mt-3">{msg}</Alert> : null}
    </Sheet>
  );
}
