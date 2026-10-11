import { useState } from 'react';
import { Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { EditStaffSheet, ImportSheet, NewStaffSheet } from '@/components/admin/StaffSheets';
import { Avatar, Button, EmptyState, Loading, Pager, Pill, Screen, TextField } from '@/components/ui';
import { Pressable } from 'react-native';
import { RequirePerm } from '@/hooks/useRequire';
import { useDebounced } from '@/hooks/useDebounced';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { shadow } from '@/theme';
import type { Staff } from '@/types';

export default function StaffScreen() {
  return <RequirePerm perm="can_access_staff"><Inner /></RequirePerm>;
}

function Inner() {
  const { me } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const dq = useDebounced(q);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['staff', dq, page],
    queryFn: () => api.get('/admin/staff/', { params: { q: dq, page } }).then((r) => r.data),
  });
  const rows: Staff[] = Array.isArray(data) ? data : data?.results ?? [];
  const total = Array.isArray(data) ? rows.length : data?.count ?? 0;
  const refresh = () => qc.invalidateQueries({ queryKey: ['staff'] });
  const canManage = !!me?.can_manage_staff;

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refetch()}>
      <TextField icon="search" placeholder="Search name, IPPIS or email…" value={q} onChangeText={(t) => { setQ(t); setPage(1); }} autoCapitalize="none" autoCorrect={false} />
      {canManage ? (
        <View className="mt-3 flex-row gap-2.5">
          <View className="flex-1"><Button variant="secondary" size="sm" icon="cloud-upload-outline" title="Bulk import" onPress={() => setImporting(true)} /></View>
          <View className="flex-1"><Button size="sm" icon="person-add-outline" title="Add staff" onPress={() => setCreating(true)} /></View>
        </View>
      ) : null}

      <View className="mt-3">
        {isLoading ? <Loading /> : rows.length === 0 ? <EmptyState icon="people-outline" title="No staff found" subtitle={q ? 'Try a different search.' : undefined} /> : null}
        {rows.map((s) => (
          <Pressable key={s.id} disabled={!canManage} onPress={() => setEditing(s)} style={shadow} className="my-1 flex-row items-center gap-3 rounded-2xl bg-white p-3.5 active:bg-surface">
            <Avatar name={`${s.first_name} ${s.last_name}`} size={44} />
            <View className="flex-1">
              <Text className="text-[15px] font-bold text-ink">{s.first_name} {s.last_name}</Text>
              <Text className="text-[12.5px] text-ink-muted">IPPIS {s.ippis_number}</Text>
              <Text numberOfLines={1} className="text-[12.5px] text-ink-muted">{[s.department_name, s.campus_name].filter(Boolean).join(' · ') || s.email}</Text>
            </View>
            <Pill label={s.is_active ? 'ACTIVE' : 'INACTIVE'} tone={s.is_active ? 'green' : 'gray'} />
          </Pressable>
        ))}
      </View>
      <Pager page={page} pages={Math.max(1, Math.ceil(total / 50))} total={total} noun="staff" onChange={setPage} />

      <NewStaffSheet visible={creating} onClose={() => setCreating(false)} onDone={refresh} />
      <ImportSheet visible={importing} onClose={() => setImporting(false)} onDone={refresh} />
      <EditStaffSheet staff={editing} onClose={() => setEditing(null)} onSaved={refresh} />
    </Screen>
  );
}
