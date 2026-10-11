import { Pressable, Text, View } from 'react-native';

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View className="flex-row rounded-xl bg-[#E4EAF2] p-1">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityState={{ selected: on }}
            className={`flex-1 items-center rounded-[10px] py-2.5 ${on ? 'bg-white' : ''}`}>
            <Text className={`text-[14px] ${on ? 'font-bold text-navy' : 'font-semibold text-ink-muted'}`}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Horizontally scrolling chip tabs (approvals). */
import { ScrollView } from 'react-native';
export function ChipTabs<T extends string>({ options, value, onChange }: { options: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-4">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} className={`flex-row items-center gap-1.5 rounded-full px-4 py-2 ${on ? 'bg-navy' : 'border border-surface-input bg-white'}`}>
            <Text className={`text-[13px] font-semibold ${on ? 'text-white' : 'text-ink'}`}>{o.label}</Text>
            {o.count ? <View className={`rounded-full px-1.5 ${on ? 'bg-white/25' : 'bg-navy-50'}`}><Text className={`text-[11px] font-bold ${on ? 'text-white' : 'text-navy'}`}>{o.count}</Text></View> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
