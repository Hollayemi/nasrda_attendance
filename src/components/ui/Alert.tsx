import { Text, View } from 'react-native';
import { Icon, type IconName } from './Icon';

type Tone = 'success' | 'error' | 'warn' | 'info';
const t: Record<Tone, { bg: string; fg: string; icon: IconName; color: string }> = {
  success: { bg: 'bg-tint-green', fg: 'text-tint-green-text', icon: 'checkmark-circle', color: '#0B6B49' },
  error: { bg: 'bg-tint-red', fg: 'text-tint-red-text', icon: 'alert-circle', color: '#8E2B20' },
  warn: { bg: 'bg-tint-amber', fg: 'text-tint-amber-text', icon: 'warning', color: '#6E5100' },
  info: { bg: 'bg-navy-50', fg: 'text-navy', icon: 'information-circle', color: '#19297D' },
};

export function Alert({ tone = 'info', children, className = '' }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  const s = t[tone];
  return (
    <View accessibilityRole="alert" className={`my-1.5 flex-row items-start gap-2.5 rounded-xl px-3.5 py-3 ${s.bg} ${className}`}>
      <View className="pt-px"><Icon name={s.icon} size={18} color={s.color} /></View>
      <View className="flex-1"><Text className={`text-[14px] leading-[20px] ${s.fg}`}>{children}</Text></View>
    </View>
  );
}
