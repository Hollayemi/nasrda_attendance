import { useState } from 'react';
import { Alert as NativeAlert, Pressable, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, DateField, Icon, Muted, Select, Sheet, TextField } from '@/components/ui';
import { api, errorOf } from '@/lib/api';
import { colors } from '@/theme';
import type { Activity, Category } from '@/types';

const blank = { category: '' as number | '', title: '', description: '', start_time: '08:00', end_time: '09:00', output: '' };
const ALLOWED = ['pdf', 'docx', 'xlsx', 'jpg', 'jpeg', 'png'];
const MAX_BYTES = 5 * 1024 * 1024;

type Props = { visible: boolean; busy: boolean; error?: string; onClose: () => void; onSubmit: () => void };

/** Daily Activity Report: staff must log at least one activity before they can check out. */
export function ActivitySheet({ visible, busy, error, onClose, onSubmit }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState(blank);
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [msg, setMsg] = useState('');

  const cats = useQuery({ queryKey: ['cats'], enabled: visible, queryFn: () => api.get('/activities/categories/').then((r) => r.data as Category[]) });
  const acts = useQuery({ queryKey: ['acts'], enabled: visible, queryFn: () => api.get('/activities/today/').then((r) => r.data as Activity[]) });

  const add = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/activities/today/', { ...form, category: Number(form.category) });
      if (file) {
        const fd = new FormData();
        fd.append('file', { uri: file.uri, name: file.name, type: file.mimeType ?? 'application/octet-stream' } as any);
        await api.post(`/activities/${data.id}/attachments/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
    },
    onSuccess: () => {
      setForm(blank); setFile(null); setMsg('');
      qc.invalidateQueries({ queryKey: ['acts'] }); qc.invalidateQueries({ queryKey: ['today'] });
    },
    onError: (e) => setMsg(errorOf(e).message || 'Check the form fields.'),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/activities/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['acts'] }); qc.invalidateQueries({ queryKey: ['today'] }); },
  });

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png'],
    });
    if (res.canceled) return;
    const a = res.assets[0];
    const ext = a.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED.includes(ext)) return setMsg('Allowed types: PDF, DOCX, XLSX, JPG, PNG.');
    if ((a.size ?? 0) > MAX_BYTES) return setMsg('File must be 5 MB or smaller.');
    setMsg(''); setFile(a);
  };

  const set = <K extends keyof typeof blank>(k: K) => (v: (typeof blank)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.category !== '' && form.title.trim() && form.description.trim();
  const count = acts.data?.length ?? 0;
  const confirmRemove = (a: Activity) =>
    NativeAlert.alert('Remove activity?', a.title, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => remove.mutate(a.id) }]);

  return (
    <Sheet
      visible={visible} onClose={onClose} tall
      title="Daily Activity Report" subtitle="Record today's activities before checking out."
      footer={
        <>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <Button variant="primary" icon="log-out-outline" loading={busy} disabled={count === 0}
            title={busy ? 'Checking out…' : `Submit ${count} ${count === 1 ? 'activity' : 'activities'} & check out`} onPress={onSubmit} />
        </>
      }
    >
      {acts.data?.map((a) => (
        <View key={a.id} className="my-1 flex-row items-center justify-between rounded-xl bg-white px-3.5 py-3">
          <View className="mr-3 flex-1">
            <Text className="text-[15px] font-bold text-ink">{a.title}</Text>
            <Muted>{a.start_time.slice(0, 5)} – {a.end_time.slice(0, 5)}</Muted>
          </View>
          <Pressable hitSlop={10} onPress={() => confirmRemove(a)} className="h-9 w-9 items-center justify-center rounded-full bg-tint-red active:opacity-70" accessibilityLabel={`Remove ${a.title}`}>
            <Icon name="trash-outline" size={17} color="#8E2B20" />
          </Pressable>
        </View>
      ))}

      <View className="mt-3 rounded-2xl bg-white p-4">
        <Text className="text-[15px] font-extrabold text-ink">Add an activity</Text>
        <Select label="Category" value={form.category} onChange={set('category')} placeholder="Select…" options={(cats.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
        <TextField label="Activity title" value={form.title} onChangeText={set('title')} />
        <TextField label="Description" multiline value={form.description} onChangeText={set('description')} />
        <View className="flex-row gap-3">
          <DateField className="flex-1" label="Start" mode="time" value={form.start_time} onChange={set('start_time')} />
          <DateField className="flex-1" label="End" mode="time" value={form.end_time} onChange={set('end_time')} />
        </View>
        <TextField label="Output / result" multiline value={form.output} onChangeText={set('output')} />

        <Text className="mb-1.5 mt-3 text-[13px] font-semibold text-ink">Supporting document (optional)</Text>
        <Pressable onPress={pick} className="flex-row items-center gap-3 rounded-xl border border-dashed border-surface-input bg-surface px-3.5 py-3 active:opacity-70">
          <Icon name={file ? 'document-attach' : 'cloud-upload-outline'} size={22} color={colors.navy} />
          <View className="flex-1">
            <Text numberOfLines={1} className="text-[14px] font-semibold text-ink">{file ? file.name : 'Attach a file'}</Text>
            <Muted>PDF, DOCX, XLSX, JPG or PNG · max 5 MB</Muted>
          </View>
          {file ? <Pressable hitSlop={10} onPress={() => setFile(null)}><Icon name="close-circle" size={20} color={colors.muted} /></Pressable> : null}
        </Pressable>

        {msg ? <Alert tone="error" className="mt-3">{msg}</Alert> : null}
        <Button className="mt-4" variant="secondary" icon="add" title="Add activity" loading={add.isPending} disabled={!valid} onPress={() => add.mutate()} />
      </View>
    </Sheet>
  );
}
