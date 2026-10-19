import { useState } from 'react';
import { Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Icon, Loading, Muted, Pill, Screen } from '@/components/ui';
import { FaceCapture } from '@/components/face/FaceCapture';
import { api, errorOf } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fmtDateTime } from '@/lib/format';
import { colors } from '@/theme';
import type { Device, FaceStatus } from '@/types';

export default function FaceSetup() {
  const { me, refresh } = useAuth();
  const qc = useQueryClient();
  const [enrolling, setEnrolling] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['face-status'], queryFn: () => api.get('/staff/face/').then((r) => r.data as FaceStatus) });
  const { data: devices = [] } = useQuery({ queryKey: ['devices'], queryFn: () => api.get('/staff/devices/').then((r) => r.data as Device[]) });
  const active = data?.status === 'active';
  const activeDevice = devices.find((d) => d.status === 'active');

  console.log(devices, activeDevice)

  // Face already enrolled (e.g. on another phone) but this account has no bound device: bind this phone.
  const canBindReplacement = active && !activeDevice;
  // A phone is registered for this account, but this is a different phone.
  const otherPhone = !!me?.require_approved_device && !!me?.has_approved_device && !me?.has_current_approved_device;

  const requestRemoval = useMutation({
    mutationFn: (id: number) => api.post(`/staff/devices/${id}/remove-request/`),
    onSuccess: () => { setMsg({ ok: true, text: 'Removal request sent. An administrator must approve it before this phone and your face verification are removed.' }); qc.invalidateQueries({ queryKey: ['devices'] }); },
    onError: (e) => setMsg({ ok: false, text: errorOf(e).message }),
  });

  const done = () => {
    setEnrolling(false);
    setMsg({ ok: true, text: 'Face verification is set up and this phone is registered. You can now check in.' });
    qc.invalidateQueries({ queryKey: ['face-status'] });
    qc.invalidateQueries({ queryKey: ['devices'] });
    refresh();
  };

  if (isLoading) return <Screen><Loading /></Screen>;

  return (
    <Screen>
      {msg ? <Alert tone={msg.ok ? 'success' : 'error'} className="mt-2">{msg.text}</Alert> : null}

      {otherPhone ? (
        <Alert tone="error" className="mt-2">This is not your registered attendance device. Use the phone you set up Face ID on, or ask an administrator to reset your device.</Alert>
      ) : null}

      {active ? (
        <Card className="mt-2">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-tint-green"><Icon name="scan-outline" size={24} color={colors.green} /></View>
            <View className="flex-1">
              <Text className="text-[16px] font-extrabold text-ink">Face verification is active</Text>
              <Muted>{activeDevice ? activeDevice.label : 'No phone registered yet'}</Muted>
            </View>
            <Icon name="checkmark-circle" size={26} color={colors.green} />
          </View>
          <View className="mt-3 flex-row gap-6">
            <View><Muted>Enrolled</Muted><Text className="text-[14px] font-bold text-ink">{data?.enrolled_at ? fmtDateTime(data.enrolled_at) : '—'}</Text></View>
            <View><Muted>Last verified</Muted><Text className="text-[14px] font-bold text-ink">{data?.last_verified_at ? fmtDateTime(data.last_verified_at) : '—'}</Text></View>
          </View>
                    {activeDevice?.removal_pending ? (
            <Alert tone="warn" className="mt-3">Phone removal is awaiting administrator approval. You can keep using this phone until it is approved. Once approved, your face verification is removed too and you'll set it up again.</Alert>
          ) : activeDevice ? (
            <Button className="mt-3" variant="danger" size="sm" icon="trash-outline" title="Remove this phone" loading={requestRemoval.isPending}
              onPress={() => requestRemoval.mutate(activeDevice.id)} />
          ) : canBindReplacement ? (
            <Button className="mt-3" icon="scan-outline" title="Set up this device" onPress={() => setEnrolling(true)} />
          ) : null}
        </Card>
      ) : (
        <Card className="mt-2">
          <View className="items-center py-2">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-navy-50"><Icon name="scan-outline" size={34} color={colors.navy} /></View>
            <Text className="mt-3 text-[18px] font-extrabold text-ink">Set up face verification</Text>
            <Muted className="mt-1 text-center">Use the front camera in good lighting. This also registers this phone automatically. Your photos are not kept: only an encrypted template is stored.</Muted>
            <View className="mt-3"><Pill label="NOT SET UP" tone="amber" /></View>
          </View>
          <Button className="mt-3" icon="camera-outline" title="Start face setup" onPress={() => setEnrolling(true)} />
        </Card>
      )}

      <FaceCapture visible={enrolling} mode="enrol" onClose={() => setEnrolling(false)} onComplete={done} />
    </Screen>
  );
}
