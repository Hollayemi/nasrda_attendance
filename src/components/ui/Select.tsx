import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Field, fieldBox } from './TextField';
import { Sheet } from './Sheet';
import { Icon } from './Icon';
import { Button } from './Button';
import { colors } from '@/theme';

export type Opt<T extends string | number = string | number> = { value: T; label: string; hint?: string };

type Base<T extends string | number> = { label?: string; hint?: string; placeholder?: string; options: Opt<T>[]; disabled?: boolean; className?: string; title?: string };

/** Single-choice picker rendered as a bottom sheet (native-feeling replacement for <select>). */
export function Select<T extends string | number>({ value, onChange, label, hint, placeholder = 'Select…', options, disabled, className, title }: Base<T> & { value: T | ''; onChange: (v: T) => void }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <Field label={label} hint={hint} className={className}>
      <Pressable disabled={disabled} onPress={() => setOpen(true)} className={`${fieldBox()} justify-between ${disabled ? 'opacity-50' : 'active:bg-surface'}`}>
        <Text numberOfLines={1} className={`flex-1 py-3 text-[16px] ${current ? 'text-ink' : 'text-[#9AA7B6]'}`}>{current?.label ?? placeholder}</Text>
        <Icon name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={title ?? label}>
        <View className="overflow-hidden rounded-2xl bg-white">
          {options.map((o, i) => {
            const on = o.value === value;
            return (
              <Pressable key={String(o.value)} onPress={() => { onChange(o.value); setOpen(false); }}
                className={`flex-row items-center justify-between px-4 py-3.5 active:bg-surface ${i > 0 ? 'border-t border-surface-line' : ''}`}>
                <View className="flex-1 pr-3">
                  <Text className={`text-[16px] ${on ? 'font-bold text-navy' : 'text-ink'}`}>{o.label}</Text>
                  {o.hint ? <Text className="text-[12px] text-ink-muted">{o.hint}</Text> : null}
                </View>
                {on ? <Icon name="checkmark-circle" size={20} color={colors.navy} /> : null}
              </Pressable>
            );
          })}
          {options.length === 0 ? <Text className="p-4 text-ink-muted">Nothing to choose from.</Text> : null}
        </View>
      </Sheet>
    </Field>
  );
}

/** Multi-choice picker (campuses, roles, permissions). */
export function MultiSelect<T extends string | number>({ value, onChange, label, hint, placeholder = 'None selected', options, className, title }: Base<T> & { value: T[]; onChange: (v: T[]) => void }) {
  const [open, setOpen] = useState(false);
  const chosen = options.filter((o) => value.includes(o.value));
  const toggle = (v: T) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <Field label={label} hint={hint} className={className}>
      <Pressable onPress={() => setOpen(true)} className={`${fieldBox()} justify-between active:bg-surface`}>
        <Text numberOfLines={2} className={`flex-1 py-3 text-[16px] ${chosen.length ? 'text-ink' : 'text-[#9AA7B6]'}`}>
          {chosen.length ? chosen.map((c) => c.label).join(', ') : placeholder}
        </Text>
        <Icon name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={title ?? label} footer={<Button title={`Done${value.length ? ` (${value.length})` : ''}`} onPress={() => setOpen(false)} />}>
        <View className="overflow-hidden rounded-2xl bg-white">
          {options.map((o, i) => {
            const on = value.includes(o.value);
            return (
              <Pressable key={String(o.value)} onPress={() => toggle(o.value)}
                className={`flex-row items-center px-4 py-3.5 active:bg-surface ${i > 0 ? 'border-t border-surface-line' : ''}`}>
                <View className={`mr-3 h-5 w-5 items-center justify-center rounded-md border ${on ? 'border-navy bg-navy' : 'border-surface-input bg-white'}`}>
                  {on ? <Icon name="checkmark" size={14} color="#fff" /> : null}
                </View>
                <View className="flex-1">
                  <Text className="text-[16px] text-ink">{o.label}</Text>
                  {o.hint ? <Text className="text-[12px] text-ink-muted">{o.hint}</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </Field>
  );
}
