import { Pressable, Switch, Text, View } from 'react-native';
import { Button } from './Button';
import { colors } from '@/theme';

export function SwitchRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)} className="mt-3 flex-row items-center justify-between gap-3 rounded-xl bg-white px-3.5 py-3">
      <View className="flex-1">
        <Text className="text-[14.5px] font-semibold text-ink">{label}</Text>
        {hint ? <Text className="mt-0.5 text-[12px] leading-[17px] text-ink-muted">{hint}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: '#CFD8E3', true: colors.navyLight }} thumbColor="#fff" ios_backgroundColor="#CFD8E3" />
    </Pressable>
  );
}

/** "Show more" paging for long lists. */
export function ShowMore({ shown, total, onMore }: { shown: number; total: number; onMore: () => void }) {
  if (shown >= total) return null;
  return <View className="mt-2"><Button variant="secondary" size="sm" title={`Show more (${total - shown} left)`} onPress={onMore} /></View>;
}

export function Pager({ page, pages, total, noun, onChange }: { page: number; pages: number; total: number; noun: string; onChange: (p: number) => void }) {
  if (total <= 0) return null;
  return (
    <View className="mt-3 flex-row items-center justify-between">
      <Text className="flex-1 text-[12px] text-ink-muted">{total} {noun} · Page {page} of {pages}</Text>
      <View className="flex-row gap-2">
        <Button variant="secondary" size="sm" title="Previous" disabled={page <= 1} onPress={() => onChange(page - 1)} />
        <Button variant="secondary" size="sm" title="Next" disabled={page >= pages} onPress={() => onChange(page + 1)} />
      </View>
    </View>
  );
}
