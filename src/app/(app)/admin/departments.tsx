import { useState } from 'react';
import { Alert as NativeAlert, Pressable, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, EmptyState, Icon, ListRow, Loading, MultiSelect, Screen, Sheet, TextField } from '@/components/ui';
import { RequirePerm } from '@/hooks/useRequire';
import { api, errorOf } from '@/lib/api';
import { colors } from '@/theme';
import type { Department, Option } from '@/types';

export default function Departments() {
  return <RequirePerm perm="can_manage_staff"><Inner /></RequirePerm>;
}

function Inner() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Department | null>(null);
  const { data: departments = [], isLoading, refetch, isRefetching } = useQuery({ queryKey: ['departments'], queryFn: () => api.get('/admin/departments/').then((r) => r.data as Department[]) });
  const [err, setErr] = useState('');
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/departments/${id}/`),
    onSuccess: () => { setErr(''); qc.invalidateQueries({ queryKey: ['departments'] }); },
    onError: (e) => setErr(errorOf(e).message),
  });
  const confirmDelete = (d: Department) =>
    NativeAlert.alert('Delete department?', d.name, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(d.id) }]);

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refetch()}>
      <Button className="mt-1" icon="add" title="New department" onPress={() => setEditing({ id: 0, name: '', campus_ids: [] })} />
      {err ? <Alert tone="error" className="mt-3">{err}</Alert> : null}
      <View className="mt-3">
        {isLoading ? <Loading /> : departments.length === 0 ? <EmptyState icon="business-outline" title="No departments yet" /> : null}
        {departments.map((d) => (
          <ListRow key={d.id} icon="business-outline" title={d.name} subtitle={d.campus_ids.length ? `${d.campus_ids.length} campus${d.campus_ids.length === 1 ? '' : 'es'} assigned` : 'Not assigned'}
            onPress={() => setEditing(d)}
            right={<Pressable hitSlop={10} onPress={() => confirmDelete(d)} className="h-9 w-9 items-center justify-center rounded-full bg-tint-red active:opacity-70"><Icon name="trash-outline" size={17} color="#8E2B20" /></Pressable>} />
        ))}
      </View>
      <DepartmentSheet department={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ['departments'] }); }} />
    </Screen>
  );
}

function DepartmentSheet({ department, onClose, onSaved }: { department: Department | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [campusIds, setCampusIds] = useState<number[]>([]);
  const [msg, setMsg] = useState('');
  const [loaded, setLoaded] = useState<Department | null>(null);
  if (department && department !== loaded) { setLoaded(department); setName(department.name); setCampusIds(department.campus_ids); setMsg(''); }
  const { data: campuses = [] } = useQuery({ queryKey: ['campuses'], enabled: !!department, queryFn: () => api.get('/admin/campuses/').then((r) => r.data as Option[]) });
  const save = useMutation({
    mutationFn: () => (department!.id ? api.patch(`/admin/departments/${department!.id}/`, { name, campus_ids: campusIds }) : api.post('/admin/departments/', { name, campus_ids: campusIds })),
    onSuccess: () => { setLoaded(null); onSaved(); },
    onError: (e) => setMsg(errorOf(e).message),
  });
  return (
    <Sheet visible={!!department} onClose={() => { setLoaded(null); onClose(); }} title={department?.id ? 'Edit department' : 'New department'}
      footer={<Button title="Save department" loading={save.isPending} disabled={!name.trim()} onPress={() => save.mutate()} />}>
      <TextField label="Department name" value={name} onChangeText={setName} />
      <MultiSelect label="Campus assignment" hint="Assign this department to one or more campuses." value={campusIds} onChange={setCampusIds} options={campuses.map((c) => ({ value: c.id, label: c.name }))} />
      {msg ? <Alert tone="error" className="mt-3">{msg}</Alert> : null}
    </Sheet>
  );
}
