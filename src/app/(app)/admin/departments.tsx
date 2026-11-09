import { useEffect, useState } from 'react';
import { Alert as NativeAlert, Pressable, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, EmptyState, Icon, ListRow, Loading, Muted, MultiSelect, Screen, Select, Sheet, TextField } from '@/components/ui';
import { RequirePerm } from '@/hooks/useRequire';
import { useAuth } from '@/lib/auth';
import { api, errorOf } from '@/lib/api';
import type { Department, Option } from '@/types';

export default function Departments() {
  return <RequirePerm perm="can_manage_staff"><Inner /></RequirePerm>;
}

function Inner() {
  const { me } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Department | null>(null);
  const [campusId, setCampusId] = useState<number | ''>('');
  const { data: departments = [], isLoading, refetch, isRefetching } = useQuery({ queryKey: ['departments'], queryFn: () => api.get('/admin/departments/').then((r) => r.data as Department[]) });
  const { data: campuses = [] } = useQuery({ queryKey: ['campuses'], queryFn: () => api.get('/admin/campuses/').then((r) => r.data as Option[]) });
  const [err, setErr] = useState('');
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/departments/${id}/`),
    onSuccess: () => { setErr(''); qc.invalidateQueries({ queryKey: ['departments'] }); },
    onError: (e) => setErr(errorOf(e).message),
  });
  const confirmDelete = (d: Department) =>
    NativeAlert.alert('Delete department?', d.name, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(d.id) }]);

  // Default to the admin's own campus, same as the website.
  useEffect(() => {
    if (!campusId && me?.primary_campus_id && campuses.some((c) => c.id === me.primary_campus_id)) setCampusId(me.primary_campus_id);
  }, [campuses, me?.primary_campus_id, campusId]);

  const campus = campuses.find((c) => c.id === campusId);
  const visible = campus ? departments.filter((d) => d.campus_ids.includes(campus.id)) : [];

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refetch()}>
      <Select label="Campus" value={campusId} onChange={setCampusId} placeholder="Select a campus…" options={campuses.map((c) => ({ value: c.id, label: c.name }))} />
      <Button className="mt-3" icon="add" title="New department" disabled={!campus}
        onPress={() => setEditing({ id: 0, name: '', campus_ids: campus ? [campus.id] : [] })} />
      {err ? <Alert tone="error" className="mt-3">{err}</Alert> : null}
      {campus ? (
        <View className="mt-4">
          <View className="mb-1.5 flex-row items-center justify-between">
            <Text className="text-[15px] font-extrabold text-ink">{campus.name}</Text>
            <Muted>{visible.length} department{visible.length === 1 ? '' : 's'}</Muted>
          </View>
          {isLoading ? <Loading /> : visible.length === 0 ? <EmptyState icon="business-outline" title="No departments are assigned to this campus yet" /> : null}
          {visible.map((d) => (
            <ListRow key={d.id} icon="business-outline" title={d.name} subtitle={`${d.campus_ids.length} campus${d.campus_ids.length === 1 ? '' : 'es'} assigned`}
              onPress={() => setEditing(d)}
              right={<Pressable hitSlop={10} onPress={() => confirmDelete(d)} className="h-9 w-9 items-center justify-center rounded-full bg-tint-red active:opacity-70"><Icon name="trash-outline" size={17} color="#8E2B20" /></Pressable>} />
          ))}
        </View>
      ) : (
        <Muted className="mt-6 text-center">Select a campus to view and manage its departments.</Muted>
      )}
      <DepartmentSheet department={editing} defaultCampus={campus} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ['departments'] }); }} />
    </Screen>
  );
}

function DepartmentSheet({ department, defaultCampus, onClose, onSaved }: { department: Department | null; defaultCampus?: Option | undefined; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [campusIds, setCampusIds] = useState<number[]>([]);
  const [msg, setMsg] = useState('');
  const [loaded, setLoaded] = useState<Department | null>(null);
  if (department && department !== loaded) { setLoaded(department); setName(department.name); setCampusIds(department.campus_ids); setMsg(''); }
  const { data: campuses = [] } = useQuery({ queryKey: ['campuses'], enabled: !!department, queryFn: () => api.get('/admin/campuses/').then((r) => r.data as Option[]) });
  const assignedCampusIds = campusIds.length ? campusIds : defaultCampus ? [defaultCampus.id] : [];
  const save = useMutation({
    mutationFn: () => (department!.id ? api.patch(`/admin/departments/${department!.id}/`, { name, campus_ids: assignedCampusIds }) : api.post('/admin/departments/', { name, campus_ids: assignedCampusIds })),
    onSuccess: () => { setLoaded(null); onSaved(); },
    onError: (e) => setMsg(errorOf(e).message),
  });
  // New departments are created for the campus being viewed; the picker still lets staff add more.
  const isNew = !department?.id;
  return (
    <Sheet visible={!!department} onClose={() => { setLoaded(null); onClose(); }} title={department?.id ? 'Edit department' : 'New department'}
      footer={<Button title="Save department" loading={save.isPending} disabled={!name.trim() || !assignedCampusIds.length} onPress={() => save.mutate()} />}>
      <TextField label="Department name" value={name} onChangeText={setName} />
      {isNew && defaultCampus ? <Muted className="-mt-1 mb-3">This department will be assigned to {defaultCampus.name}.</Muted> : null}
      <MultiSelect label="Campus assignment" hint="Assign this department to at least one campus." value={assignedCampusIds} onChange={setCampusIds} options={campuses.map((c) => ({ value: c.id, label: c.name }))} />
      {msg ? <Alert tone="error" className="mt-3">{msg}</Alert> : null}
    </Sheet>
  );
}