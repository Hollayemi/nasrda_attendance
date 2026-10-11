import { useState } from 'react';
import { Alert as NativeAlert, Pressable, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, EmptyState, Icon, ListRow, Loading, MultiSelect, Screen, Sheet, TextField } from '@/components/ui';
import { RequirePerm } from '@/hooks/useRequire';
import { api, errorOf } from '@/lib/api';
import type { Permission, Role } from '@/types';

export default function Roles() {
  return <RequirePerm perm="can_manage_roles"><Inner /></RequirePerm>;
}

function Inner() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Role | null>(null);
  const [err, setErr] = useState('');
  const { data: roles = [], isLoading, refetch, isRefetching } = useQuery({ queryKey: ['roles'], queryFn: () => api.get('/admin/roles/').then((r) => r.data as Role[]) });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/roles/${id}/`),
    onSuccess: () => { setErr(''); qc.invalidateQueries({ queryKey: ['roles'] }); },
    onError: (e) => setErr(errorOf(e).message),
  });
  const confirmDelete = (r: Role) => NativeAlert.alert('Delete role?', r.name, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(r.id) }]);

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refetch()}>
      <Button className="mt-1" icon="add" title="New role" onPress={() => setEditing({ id: 0, name: '', permission_ids: [], permissions: [], member_count: 0 })} />
      {err ? <Alert tone="error" className="mt-3">{err}</Alert> : null}
      <View className="mt-3">
        {isLoading ? <Loading /> : roles.length === 0 ? <EmptyState icon="shield-outline" title="No roles yet" /> : null}
        {roles.map((r) => (
          <ListRow key={r.id} icon="shield-outline" title={r.name} onPress={() => setEditing(r)}
            subtitle={`${r.member_count} staff · ${r.permissions.length} permission${r.permissions.length === 1 ? '' : 's'}`}
            subtitle2={r.permissions.map((p) => p.name).join(', ') || 'No permissions'}
            right={r.member_count === 0 ? <Pressable hitSlop={10} onPress={() => confirmDelete(r)} className="h-9 w-9 items-center justify-center rounded-full bg-tint-red active:opacity-70"><Icon name="trash-outline" size={17} color="#8E2B20" /></Pressable> : undefined} />
        ))}
      </View>
      <RoleSheet role={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ['roles'] }); }} />
    </Screen>
  );
}

function RoleSheet({ role, onClose, onSaved }: { role: Role | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [msg, setMsg] = useState('');
  const [loaded, setLoaded] = useState<Role | null>(null);
  if (role && role !== loaded) { setLoaded(role); setName(role.name); setSelected(role.permissions.map((p) => p.id)); setMsg(''); }
  const { data: permissions = [] } = useQuery({ queryKey: ['permissions'], enabled: !!role, queryFn: () => api.get('/admin/permissions/').then((r) => r.data as Permission[]) });
  const save = useMutation({
    mutationFn: () => (role!.id ? api.patch(`/admin/roles/${role!.id}/`, { name, permission_ids: selected }) : api.post('/admin/roles/', { name, permission_ids: selected })),
    onSuccess: () => { setLoaded(null); onSaved(); },
    onError: (e) => setMsg(errorOf(e).message),
  });
  return (
    <Sheet visible={!!role} onClose={() => { setLoaded(null); onClose(); }} title={role?.id ? 'Edit role' : 'Create role'}
      footer={<Button title="Save role" loading={save.isPending} disabled={!name.trim()} onPress={() => save.mutate()} />}>
      <TextField label="Role name" value={name} onChangeText={setName} placeholder="e.g. HR Officer" />
      <MultiSelect label="Permissions" title="Permissions" value={selected} onChange={setSelected} placeholder="No permissions" options={permissions.map((p) => ({ value: p.id, label: p.name, hint: p.code }))} />
      {selected.length ? <Text className="mt-2 text-[12px] text-ink-muted">{selected.length} permission{selected.length === 1 ? '' : 's'} selected</Text> : null}
      {msg ? <Alert tone="error" className="mt-3">{msg}</Alert> : null}
    </Sheet>
  );
}
