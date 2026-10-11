import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Icon, type IconName } from './Icon';
import { colors } from '@/theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
type Props = {
  title: string; onPress?: () => void; variant?: Variant; size?: 'md' | 'sm';
  loading?: boolean; disabled?: boolean; icon?: IconName; className?: string; haptic?: boolean;
};

const box: Record<Variant, string> = {
  primary: 'bg-navy active:bg-navy-dark',
  success: 'bg-brand-green active:opacity-90',
  danger: 'bg-tint-red active:opacity-80',
  secondary: 'bg-white border border-surface-input active:bg-surface',
  ghost: 'bg-transparent active:bg-navy-50',
};
const label: Record<Variant, string> = {
  primary: 'text-white', success: 'text-white', danger: 'text-tint-red-text', secondary: 'text-ink', ghost: 'text-navy',
};
const tint: Record<Variant, string> = {
  primary: colors.white, success: colors.white, danger: '#8E2B20', secondary: colors.ink, ghost: colors.navy,
};

export function Button({ title, onPress, variant = 'primary', size = 'md', loading, disabled, icon, className = '', haptic = true }: Props) {
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={() => { if (haptic) Haptics.selectionAsync().catch(() => {}); onPress?.(); }}
      className={`flex-row items-center justify-center gap-2 rounded-xl ${size === 'sm' ? 'min-h-[38px] px-3.5' : 'min-h-[50px] px-4'} ${box[variant]} ${off ? 'opacity-50' : ''} ${className}`}
    >
      {loading ? <ActivityIndicator size="small" color={tint[variant]} /> : icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} color={tint[variant]} /> : null}
      <Text className={`font-bold ${size === 'sm' ? 'text-[13px]' : 'text-[15px]'} ${label[variant]}`}>{title}</Text>
    </Pressable>
  );
}

/** Text-only link-style button. */
export function LinkButton({ title, onPress, tone = 'navy', className = '' }: { title: string; onPress?: () => void; tone?: 'navy' | 'red'; className?: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} className={`self-start py-1.5 active:opacity-60 ${className}`}>
      <Text className={`text-[14px] font-semibold ${tone === 'red' ? 'text-brand-red' : 'text-navy'}`}>{title}</Text>
    </Pressable>
  );
}

export const ButtonRow = ({ children }: { children: React.ReactNode }) => <View className="flex-row gap-2.5 [&>*]:flex-1">{children}</View>;
