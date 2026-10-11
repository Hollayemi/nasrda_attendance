import { useEffect } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Icon } from '@/components/ui';

type Props = { kind: 'in' | 'out'; busyLabel?: string; disabled?: boolean; onPress: () => void };

/** The big circular Check-in / Check-out button with a soft pulsing halo while it is actionable. */
export function ActionButton({ kind, busyLabel, disabled, onPress }: Props) {
  const pulse = useSharedValue(0);
  const active = !disabled && !busyLabel;
  useEffect(() => {
    pulse.value = active ? withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false) : 0;
  }, [active, pulse]);
  const halo = useAnimatedStyle(() => ({ opacity: 0.35 * (1 - pulse.value), transform: [{ scale: 1 + pulse.value * 0.28 }] }));

  const bg = disabled ? '#98A4B3' : kind === 'in' ? '#0F8A5F' : '#19297D';
  const ring = disabled ? '#C3CBD6' : kind === 'in' ? '#8FD3B8' : '#9AA6DC';
  return (
    <View className="h-[250px] w-[250px] items-center justify-center">
      <Animated.View pointerEvents="none" className="absolute h-[196px] w-[196px] rounded-full" style={[{ backgroundColor: ring }, halo]} />
      <View className="absolute h-[222px] w-[222px] rounded-full" style={{ backgroundColor: ring, opacity: 0.28 }} />
      <Pressable
        accessibilityRole="button" accessibilityLabel={kind === 'in' ? 'Check in' : 'Check out'} accessibilityState={{ disabled: !!disabled || !!busyLabel }}
        disabled={disabled || !!busyLabel}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); onPress(); }}
        className="h-[190px] w-[190px] items-center justify-center rounded-full p-5 active:scale-95"
        style={{ backgroundColor: bg, elevation: 10, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 10 } }}
      >
        {busyLabel ? (
          <>
            <ActivityIndicator color="#fff" size="large" />
            <Text className="mt-3 text-center text-[13px] font-bold leading-[18px] text-white">{busyLabel}</Text>
          </>
        ) : (
          <>
            <Icon name={kind === 'in' ? 'finger-print' : 'log-out-outline'} size={46} color="#fff" />
            <Text className="mt-1.5 text-[21px] font-extrabold tracking-wide text-white">{kind === 'in' ? 'CHECK IN' : 'CHECK OUT'}</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}
