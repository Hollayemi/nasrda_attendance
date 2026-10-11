import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Field, fieldBox } from './TextField';
import { Sheet } from './Sheet';
import { Button } from './Button';
import { Icon } from './Icon';
import { colors } from '@/theme';
import { fmtDay, fmtHM, fromHM, fromYMD, toHM, toYMD } from '@/lib/format';

type Props = { label?: string; value: string; onChange: (v: string) => void; mode?: 'date' | 'time'; minimumDate?: string; maximumDate?: string; hint?: string; className?: string };

/**
 * Date / time input. Android uses the system dialog; iOS shows a spinner in a bottom sheet.
 * Values are plain strings ("YYYY-MM-DD" / "HH:MM") to match the API.
 */
export function DateField({ label, value, onChange, mode = 'date', minimumDate, maximumDate, hint, className }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(new Date());
  const asDate = () => (mode === 'date' ? (value ? fromYMD(value) : new Date()) : fromHM(value));
  const commit = (d: Date) => onChange(mode === 'date' ? toYMD(d) : toHM(d));
  const text = mode === 'date' ? fmtDay(value) : value ? fmtHM(value) : 'Select time';

  const show = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: asDate(), mode, is24Hour: false,
        minimumDate: minimumDate ? fromYMD(minimumDate) : undefined,
        maximumDate: maximumDate ? fromYMD(maximumDate) : undefined,
        onChange: (e: DateTimePickerEvent, d?: Date) => { if (e.type === 'set' && d) commit(d); },
      });
    } else { setDraft(asDate()); setOpen(true); }
  };

  return (
    <Field label={label} hint={hint} className={className}>
      <Pressable onPress={show} className={`${fieldBox()} justify-between active:bg-surface`}>
        <Text className={`py-3 text-[16px] ${value ? 'text-ink' : 'text-[#9AA7B6]'}`}>{text}</Text>
        <Icon name={mode === 'date' ? 'calendar-outline' : 'time-outline'} size={18} color={colors.muted} />
      </Pressable>
      {Platform.OS === 'ios' ? (
        <Sheet visible={open} onClose={() => setOpen(false)} title={label} footer={<Button title="Done" onPress={() => { commit(draft); setOpen(false); }} />}>
          <View className="items-center rounded-2xl bg-white py-2">
            <DateTimePicker
              value={draft} mode={mode} display="spinner" themeVariant="light"
              minimumDate={minimumDate ? fromYMD(minimumDate) : undefined}
              maximumDate={maximumDate ? fromYMD(maximumDate) : undefined}
              onChange={(_, d) => d && setDraft(d)}
            />
          </View>
        </Sheet>
      ) : null}
    </Field>
  );
}
