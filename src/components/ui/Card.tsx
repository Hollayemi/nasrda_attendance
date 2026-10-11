import { Pressable, Text, View, type ViewProps } from 'react-native';
import { shadow } from '@/theme';

export function Card({ className = '', style, ...rest }: ViewProps & { className?: string }) {
  return <View {...rest} style={[shadow, style]} className={`rounded-card bg-white p-4 ${className}`} />;
}

export function SectionTitle({ children, right, className = '' }: { children: string; right?: React.ReactNode; className?: string }) {
  return (
    <View className={`mb-2 mt-5 flex-row items-center justify-between ${className}`}>
      <Text className="text-[13px] font-bold uppercase tracking-wider text-ink-muted">{children}</Text>
      {right}
    </View>
  );
}

export function Divider() {
  return <View className="my-3 h-px bg-surface-line" />;
}

export function Tappable({ onPress, children, className = '' }: { onPress?: () => void; children: React.ReactNode; className?: string }) {
  return (
    <Pressable onPress={onPress} className={`active:opacity-70 ${className}`}>
      {children}
    </Pressable>
  );
}

export function Muted({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <Text className={`text-[13px] leading-[19px] text-ink-muted ${className}`}>{children}</Text>;
}
