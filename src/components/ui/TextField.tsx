import { useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Icon, type IconName } from './Icon';
import { colors } from '@/theme';

type Props = TextInputProps & { label?: string; hint?: string; error?: string; icon?: IconName; secure?: boolean; className?: string; inputClassName?: string };

export function Field({ label, children, hint, className = '' }: { label?: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <View className={`mt-3 ${className}`}>
      {label ? <Text className="mb-1.5 text-[13px] font-semibold text-ink">{label}</Text> : null}
      {children}
      {hint ? <Text className="mt-1 text-[12px] leading-[17px] text-ink-muted">{hint}</Text> : null}
    </View>
  );
}

export const fieldBox = (focused = false, error = false) =>
  `min-h-[50px] flex-row items-center rounded-xl border bg-white px-3 ${error ? 'border-brand-red' : focused ? 'border-navy-light' : 'border-surface-input'}`;

export function TextField({ label, hint, error, icon, secure, multiline, className = '', inputClassName = '', ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  return (
    <Field label={label} hint={error ?? hint} className={className}>
      <View className={`${fieldBox(focused, !!error)} ${multiline ? 'items-start py-1' : ''}`}>
        {icon ? <View className="mr-2"><Icon name={icon} size={18} color={focused ? colors.navy : colors.muted} /></View> : null}
        <TextInput
          {...rest}
          multiline={multiline}
          secureTextEntry={secure && hidden}
          placeholderTextColor={colors.placeholder}
          onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
          textAlignVertical={multiline ? 'top' : 'center'}
          className={`flex-1 text-[16px] text-ink ${multiline ? 'min-h-[84px] py-2' : 'py-3'} ${inputClassName}`}
        />
        {secure ? (
          <Pressable hitSlop={10} onPress={() => setHidden((h) => !h)} accessibilityLabel={hidden ? 'Show password' : 'Hide password'} className="ml-2 p-1">
            <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
    </Field>
  );
}
