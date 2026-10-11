import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Alert, EmptyState, ListRow, Pill, Screen, SectionTitle, ShowMore, StatTile, type IconName } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fmtTime } from '@/lib/format';
import { colors, shadow } from '@/theme';
import type { Me } from '@/types';
import { useState } from 'react';

type Live = { id: number; name: string; ippis: string; department: string; check_in_at: string; check_out_at: string | null; status: string; campus: string; review: string };
type Link = { href: Href; icon: IconName; label: string; hint: string; access: keyof Me };

const LINKS: Link[] = [
  { href: '/admin/approvals', icon: 'checkmark-done-circle-outline', label: 'Approvals', hint: 'Leave, duty, devices & flagged records', access: 'can_access_approvals' },
  { href: '/admin/staff', icon: 'people-outline', label: 'Staff', hint: 'Directory, roles and accounts', access: 'can_access_staff' },
  { href: '/admin/reports', icon: 'document-text-outline', label: 'Reports', hint: 'Daily & monthly exports', access: 'can_export_reports' },
  { href: '/admin/departments', icon: 'business-outline', label: 'Departments', hint: 'Departments and campus assignment', access: 'can_manage_staff' },
  { href: '/admin/geofence', icon: 'map-outline', label: 'Geofences', hint: 'Campuses and attendance boundaries', access: 'can_manage_geofence' },
  { href: '/admin/holidays', icon: 'calendar-outline', label: 'Holidays', hint: 'Public holidays & working days', access: 'can_manage_roles' },
  { href: '/admin/roles', icon: 'shield-outline', label: 'Roles & permissions', hint: 'Who can do what', access: 'can_manage_roles' },
  { href: '/admin/settings', icon: 'settings-outline', label: 'System settings', hint: 'Hours, location & device security', access: 'can_manage_roles' },
  { href: '/admin/audit', icon: 'reader-outline', label: 'Audit log', hint: 'Every sensitive action, recorded', access: 'can_view_audit' },
];

export default function AdminHub() {
  const { me } = useAuth();
  const [shown, setShown] = useState(8);
  const dash = !!me?.can_admin;
  const stats = useQuery({ queryKey: ['dash'], enabled: dash, queryFn: () => api.get('/admin/dashboard/').then((r) => r.data), refetchInterval: 15_000 });
  const live = useQuery({ queryKey: ['live'], enabled: dash, queryFn: () => api.get('/admin/attendance/').then((r) => r.data as Live[]), refetchInterval: 15_000 });
  const s = stats.data;
  const v = (k: string) => (s?.[k] ?? '…');
  const links = LINKS.filter((l) => me?.[l.access]);

  return (
    <Screen title="Admin" subtitle={dash ? "Today's attendance at a glance." : 'Administration'}
      refreshing={stats.isRefetching || live.isRefetching} onRefresh={() => { void stats.refetch(); void live.refetch(); }}>
      {dash ? (
        <>
          {s?.non_working_reason ? <Alert tone="success" className="mt-3">Office closed today. {s.non_working_reason} No staff are counted as absent.</Alert> : null}
          <View className="mt-3 flex-row flex-wrap gap-3">
            <StatTile value={v('total_staff')} label="Total staff" icon="people-outline" />
            <StatTile value={v('present')} label="Present" icon="checkmark-circle-outline" color={colors.green} bg="#DFF5EA" />
            <StatTile value={v('late')} label="Late" icon="alarm-outline" color={colors.amber} bg="#FFF1CC" />
            <StatTile value={v('absent')} label="Absent" icon="close-circle-outline" color={colors.red} bg="#FDE2DF" />
            <StatTile value={v('on_site')} label="On-site now" icon="location-outline" />
            <StatTile value={v('checked_out')} label="Checked out" icon="log-out-outline" color={colors.muted} bg="#E9EEF4" />
            <StatTile value={v('official_duty')} label="Official duty" icon="briefcase-outline" />
            <StatTile value={v('on_leave')} label="On leave" icon="airplane-outline" color={colors.amber} bg="#FFF1CC" />
          </View>
          {s && (s.exceptions > 0 || s.early_departures > 0) ? (
            <Alert tone="warn" className="mt-3">{s.exceptions} flagged for review · {s.early_departures} early departure{s.early_departures === 1 ? '' : 's'}</Alert>
          ) : null}
        </>
      ) : null}

      {links.length ? <SectionTitle>Manage</SectionTitle> : null}
      {links.map((l) => <ListRow key={l.label} icon={l.icon} title={l.label} subtitle={l.hint} chevron onPress={() => router.push(l.href)} />)}

      {dash ? (
        <>
          <SectionTitle right={<Text className="text-[11px] text-ink-muted">auto-refreshing</Text>}>Live board</SectionTitle>
          {live.data?.length === 0 ? <EmptyState icon="people-outline" title="No check-ins yet today" /> : null}
          {live.data?.slice(0, shown).map((r) => (
            <View key={r.id} style={shadow} className="my-1 rounded-2xl bg-white p-3.5">
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1">
                  <Text className="text-[15px] font-bold text-ink">{r.name}</Text>
                  <Text className="text-[12px] text-ink-muted">{r.ippis}{r.department ? ` · ${r.department}` : ''}</Text>
                </View>
                <Pill label={r.status === 'late' ? 'LATE' : 'PRESENT'} tone={r.status === 'late' ? 'red' : 'green'} />
              </View>
              <View className="mt-2 flex-row items-center justify-between">
                <Text className="text-[13px] text-ink">{fmtTime(r.check_in_at)} → {r.check_out_at ? fmtTime(r.check_out_at) : 'on site'} · {r.campus}</Text>
                {r.review === 'review_required' ? <Pill label="REVIEW" tone="red" /> : null}
              </View>
            </View>
          ))}
          {live.data ? <ShowMore shown={shown} total={live.data.length} onMore={() => setShown((n) => n + 10)} /> : null}
        </>
      ) : null}
    </Screen>
  );
}
