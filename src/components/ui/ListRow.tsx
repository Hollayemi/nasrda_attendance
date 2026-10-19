import { Pressable, Text, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { shadow, colors } from '@/theme';

type Props = {
  title: string; subtitle?: string; subtitle2?: string; subtitle2Tone?: 'green' | 'red' | 'muted';
  icon?: IconName; iconColor?: string; iconBg?: string; right?: React.ReactNode; chevron?: boolean;
  onPress?: () => void; className?: string; flat?: boolean;
};

/** Standard list item: optional icon bubble, title, up to two sub-lines, trailing content. */
export function ListRow({ title, subtitle, subtitle2, subtitle2Tone = 'muted', icon, iconColor = colors.navy, iconBg = '#EEF1FB', right, chevron, onPress, className = '', flat }: Props) {
  const tone = subtitle2Tone === 'green' ? 'text-brand-green font-semibold' : subtitle2Tone === 'red' ? 'text-brand-red font-semibold' : 'text-ink-muted';
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={flat ? undefined : shadow}
      className={`flex-row items-center gap-3 bg-white px-3.5 py-3 ${flat ? '' : 'my-1 rounded-2xl'} ${onPress ? 'active:bg-surface' : ''} ${className}`}>
      {icon ? (
        <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: iconBg }}>
          <Icon name={icon} size={20} color={iconColor} />
        </View>
      ) : null}
      <View className="flex-1">
        <Text className="text-[15px] font-bold text-ink">{title}</Text>
        {subtitle ? <Text className="mt-0.5 text-[12.5px] leading-[18px] text-ink-muted">{subtitle}</Text> : null}
        {subtitle2 ? <Text className={`mt-0.5 text-[12.5px] leading-[18px] ${tone}`}>{subtitle2}</Text> : null}
      </View>
      {right}
      {chevron ? <Icon name="chevron-forward" size={18} color="#B4BFCC" /> : null}
    </Pressable>
  );
}

export function EmptyState({ icon = 'file-tray-outline', title, subtitle }: { icon?: IconName; title: string; subtitle?: string }) {
  return (
    <View className="items-center px-6 py-10">
      <View className="mb-3 h-16 w-16 items-center justify-center rounded-full bg-navy-50">
        <Icon name={icon} size={28} color={colors.navy} />
      </View>
      <Text className="text-[16px] font-bold text-ink">{title}</Text>
      {subtitle ? <Text className="mt-1 text-center text-[13px] leading-[19px] text-ink-muted">{subtitle}</Text> : null}
    </View>
  );
}

export function StatTile({ value, label, icon, color = colors.navy, bg = '#EEF1FB' }: { value: string | number; label: string; icon: IconName; color?: string; bg?: string }) {
  return (
    <View style={shadow} className="min-w-[32%] flex-1 rounded-2xl bg-white p-3.5">
      <View className="mb-2.5 h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: bg }}>
        <Icon name={icon} size={18} color={color} />
      </View>
      <Text className="text-[26px] font-extrabold leading-[30px] text-ink">{value}</Text>
      <Text className="mt-0.5 text-[12px] font-semibold text-ink-muted">{label}</Text>
    </View>
  );
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';
  return (
    <View className="items-center justify-center rounded-full bg-navy" style={{ width: size, height: size }}>
      <Text className="font-extrabold text-white" style={{ fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}
