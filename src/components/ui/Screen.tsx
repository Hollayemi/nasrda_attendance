import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme';

type Props = {
  children: React.ReactNode;
  /** Large page title (tab screens). Pushed screens use the native header instead. */
  title?: string; subtitle?: string; right?: React.ReactNode;
  refreshing?: boolean; onRefresh?: () => void;
  /** Extra bottom padding, e.g. to clear a floating button. */
  footerSpace?: number; wide?: boolean;
};

export function Screen({ children, title, subtitle, right, refreshing, onRefresh, footerSpace = 24, wide }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerStyle={{ paddingTop: title ? insets.top + 10 : 8, paddingBottom: footerSpace + 8 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.navy} colors={[colors.navy]} /> : undefined}
    >
      <View className={`w-full self-center px-4 ${wide ? 'max-w-[900px]' : 'max-w-[640px]'}`}>
        {title ? (
          <View className="mb-2 flex-row items-end justify-between">
            <View className="mr-3 flex-1">
              <Text className="text-[28px] font-extrabold leading-[34px] text-ink">{title}</Text>
              {subtitle ? <Text className="mt-0.5 text-[14px] leading-[20px] text-ink-muted">{subtitle}</Text> : null}
            </View>
            {right}
          </View>
        ) : null}
        {children}
      </View>
    </ScrollView>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <View className="items-center justify-center gap-3 py-12">
      <ActivityIndicator color={colors.navy} />
      <Text className="text-[13px] text-ink-muted">{label}</Text>
    </View>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <View className={`animate-pulse rounded-xl bg-[#E4EAF2] ${className}`} />;
}
