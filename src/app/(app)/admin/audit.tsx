import { useState } from 'react';
import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { EmptyState, Loading, Pager, Pill, Screen, TextField } from '@/components/ui';
import { RequirePerm } from '@/hooks/useRequire';
import { useDebounced } from '@/hooks/useDebounced';
import { api } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';
import { shadow } from '@/theme';

export default function Audit() {
  return <RequirePerm perm="can_view_audit"><Inner /></RequirePerm>;
}

function Inner() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const dAction = useDebounced(action);
  const { data, isLoading, refetch, isRefetching } = useQuery({ queryKey: ['audit', dAction, page], queryFn: () => api.get('/admin/audit-logs/', { params: { action: dAction, page } }).then((r) => r.data) });
  const entries: any[] = data?.results ?? [];
  const total = data?.count ?? 0;
  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refetch()}>
      <TextField icon="funnel-outline" placeholder="Filter by action (e.g. attendance.check_in)" value={action} onChangeText={(t) => { setAction(t); setPage(1); }} autoCapitalize="none" autoCorrect={false} />
      <View className="mt-3">
        {isLoading ? <Loading /> : entries.length === 0 ? <EmptyState icon="reader-outline" title="No log entries" /> : null}
        {entries.map((e) => (
          <View key={e.id} style={shadow} className="my-1 rounded-2xl bg-white p-3.5">
            <View className="flex-row items-center justify-between gap-2"><Pill label={String(e.action).toUpperCase()} tone="navy" className="max-w-[70%]" /><Text className="text-[11.5px] text-ink-muted">{fmtDateTime(e.created_at)}</Text></View>
            <Text className="mt-2 text-[14px] font-bold text-ink">{e.user || 'System'}</Text>
            {e.description ? <Text className="mt-0.5 text-[13px] leading-[18px] text-ink">{e.description}</Text> : null}
            {e.ip_address ? <Text className="mt-1 text-[11.5px] text-ink-muted">IP {e.ip_address}</Text> : null}
          </View>
        ))}
      </View>
      <Pager page={page} pages={Math.max(1, Math.ceil(total / 100))} total={total} noun="log entries" onChange={setPage} />
    </Screen>
  );
}
