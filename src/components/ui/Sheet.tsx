import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { colors } from '@/theme';

type Props = {
  visible: boolean; onClose: () => void; title?: string; subtitle?: string; children: React.ReactNode;
  /** Pinned below the scrolling content (e.g. a primary action). */
  footer?: React.ReactNode; tall?: boolean;
};

/** Bottom sheet used for forms, pickers and confirmations. */
export function Sheet({ visible, onClose, title, subtitle, children, footer, tall }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end">
        <Pressable accessibilityLabel="Close" onPress={onClose} className="absolute inset-0 bg-[#081423]/50" />
        <View
          className={`overflow-hidden rounded-t-[24px] bg-surface ${tall ? 'h-[92%]' : 'max-h-[92%]'}`}
          style={{ paddingTop: 8 }}
        >
          <View className="mb-1 h-[5px] w-11 self-center rounded-full bg-[#C5D0DC]" />
          <View className="flex-row items-start justify-between px-4 pb-2 pt-2">
            <View className="mr-3 flex-1">
              {title ? <Text className="text-[20px] font-extrabold text-ink">{title}</Text> : null}
              {subtitle ? <Text className="mt-0.5 text-[13px] leading-[18px] text-ink-muted">{subtitle}</Text> : null}
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close" className="h-8 w-8 items-center justify-center rounded-full bg-surface-line active:opacity-70">
              <Icon name="close" size={18} color={colors.muted} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerClassName="px-4 pb-4">
            {children}
          </ScrollView>
          {footer ? (
            <View className="border-t border-surface-line bg-surface px-4 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>{footer}</View>
          ) : <View style={{ height: Math.max(insets.bottom, 8) }} />}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
