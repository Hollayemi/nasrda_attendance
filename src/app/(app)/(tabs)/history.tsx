import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, EmptyState, Icon, Loading, Pill, Screen, StatTile } from '@/components/ui';
import { api } from '@/lib/api';
import { fmtDayShort, fmtMonth, fmtTime, shiftMonth, thisMonth } from '@/lib/format';
import { colors, shadow } from '@/theme';
import type { AttendanceRecord } from '@/types';

export default function History() {
  const [month, setMonth] = useState(thisMonth());
  const { data = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['history', month],
    queryFn: () => api.get('/attendance/history/', { params: { month } }).then((r) => r.data as AttendanceRecord[]),
  });
  const late = data.filter((r) => r.check_in_status === 'late').length;
  const isCurrent = month === thisMonth();

  return (
    <Screen title="History" subtitle="Your attendance record, month by month." refreshing={isRefetching} onRefresh={() => void refetch()}>
      <Card className="mt-3 flex-row items-center justify-between p-2">
        <Pressable onPress={() => setMonth(shiftMonth(month, -1))} hitSlop={8} accessibilityLabel="Previous month" className="h-11 w-11 items-center justify-center rounded-xl active:bg-surface">
          <Icon name="chevron-back" size={22} color={colors.navy} />
        </Pressable>
        <View className="items-center">
          <Text className="text-[17px] font-extrabold text-ink">{fmtMonth(month)}</Text>
          {!isCurrent ? <Pressable onPress={() => setMonth(thisMonth())}><Text className="text-[12px] font-semibold text-navy">Jump to this month</Text></Pressable> : null}
        </View>
        <Pressable disabled={isCurrent} onPress={() => setMonth(shiftMonth(month, 1))} hitSlop={8} accessibilityLabel="Next month"
          className={`h-11 w-11 items-center justify-center rounded-xl active:bg-surface ${isCurrent ? 'opacity-30' : ''}`}>
          <Icon name="chevron-forward" size={22} color={colors.navy} />
        </Pressable>
      </Card>

      <View className="mt-3 flex-row gap-3">
        <StatTile value={data.length} label="Days present" icon="calendar-number-outline" />
        <StatTile value={data.length - late} label="On time" icon="checkmark-circle-outline" color={colors.green} bg="#DFF5EA" />
        <StatTile value={late} label="Late days" icon="alarm-outline" color={colors.red} bg="#FDE2DF" />
      </View>

      <View className="mt-3">
        {isLoading ? <Loading /> : data.length === 0 ? <EmptyState icon="calendar-clear-outline" title="No records this month" subtitle="Days you check in will appear here." /> : null}
        {data.map((r) => {
          const d = fmtDayShort(r.date);
          const isLate = r.check_in_status === 'late';
          return (
            <View key={r.id} style={shadow} className="my-1 flex-row items-center gap-3.5 rounded-2xl bg-white p-3.5">
              <View className={`h-14 w-14 items-center justify-center rounded-2xl ${isLate ? 'bg-tint-red' : 'bg-navy-50'}`}>
                <Text className={`text-[11px] font-bold uppercase ${isLate ? 'text-tint-red-text' : 'text-navy'}`}>{d.dow}</Text>
                <Text className={`text-[21px] font-extrabold leading-[24px] ${isLate ? 'text-tint-red-text' : 'text-navy'}`}>{d.day}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-ink">{fmtTime(r.check_in_at)}  →  {r.check_out_at ? fmtTime(r.check_out_at) : 'In progress'}</Text>
                <Text className="mt-0.5 text-[12.5px] text-ink-muted">{r.campus_name} · {r.activity_count} {r.activity_count === 1 ? 'activity' : 'activities'}</Text>
              </View>
              <Pill label={isLate ? 'LATE' : 'ON TIME'} tone={isLate ? 'red' : 'green'} />
            </View>
          );
        })}
      </View>
    </Screen>
  );
}
