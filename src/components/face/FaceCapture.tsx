import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { Alert, Button, ButtonRow, Muted } from '@/components/ui';
import { api, errorOf } from '@/lib/api';
import { deviceLabel, deviceToken } from '@/lib/device';
import { colors } from '@/theme';

type Props = {
  visible: boolean;
  mode: 'enrol' | 'verify';
  action?: 'check-in' | 'check-out';
  onComplete: (verificationId?: string) => void;
  onClose: () => void;
};

const ENROL_STEPS = ['Look straight at the camera', 'Turn your head slightly left', 'Turn your head slightly right'];
const VERIFY_STEPS = ['Look straight at the camera'];

/**
 * Live face capture, the same flow the web app uses:
 *  - enrol: three photos are sent to /staff/face/enroll/ with this phone's device token
 *  - verify: the server issues a challenge; one photo goes to /attendance/face/verify/
 *    which returns a one-use verification id that the check-in / check-out request carries.
 * The photos are only used to build / compare the encrypted template and are not stored on the phone.
 */
export function FaceCapture({ visible, mode, action, onComplete, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [steps, setSteps] = useState<string[]>(mode === 'enrol' ? ENROL_STEPS : VERIFY_STEPS);
  const [challengeId, setChallengeId] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const requiredShots = mode === 'enrol' ? 3 : 1;

  // (Re)start whenever the sheet opens.
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    setImages([]); setError(''); setReady(false); setChallengeId('');
    setSteps(mode === 'enrol' ? ENROL_STEPS : VERIFY_STEPS);
    if (mode === 'verify') {
      setLoading(true);
      api.post('/attendance/face/challenge/', { action })
        .then(({ data }) => { if (alive) { setSteps(data.steps); setChallengeId(data.challenge_id); } })
        .catch((e) => alive && setError(errorOf(e).message))
        .finally(() => alive && setLoading(false));
    }
    return () => { alive = false; };
  }, [visible, mode, action]);

  const step = steps[images.length] ?? 'Registering…';
  const last = images.length === requiredShots - 1;

  const capture = async () => {
    if (!camera.current || !ready) return setError('Camera is still starting. Please wait.');
    setError(''); setBusy(true);
    try {
      const shot = await camera.current.takePictureAsync({ quality: 0.9, shutterSound: false, skipProcessing: false });
      // Keep uploads small (the web app sends ~720px frames).
      const small = await manipulateAsync(shot.uri, [{ resize: { width: 720 } }], { compress: 0.88, format: SaveFormat.JPEG, base64: true });
      if (!small.base64) throw new Error('Could not read the photo.');
      const next = [...images, `data:image/jpeg;base64,${small.base64}`];
      Haptics.selectionAsync().catch(() => {});
      setImages(next);
      if (next.length < requiredShots) return;

      if (mode === 'enrol') {
        await api.post('/staff/face/enroll/', { images: next, device_token: await deviceToken(), label: deviceLabel() });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onComplete();
      } else {
        const { data } = await api.post('/attendance/face/verify/', { challenge_id: challengeId, images: next });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onComplete(data.verification_id);
      }
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setImages([]); setError(errorOf(e).message);
      // A failed verification consumes the challenge: fetch a new one so the person can retry straight away.
      if (mode === 'verify') {
        api.post('/attendance/face/challenge/', { action }).then(({ data }) => { setSteps(data.steps); setChallengeId(data.challenge_id); }).catch(() => {});
      }
    } finally { setBusy(false); }
  };

  const denied = permission && !permission.granted;
  const title = mode === 'enrol' ? 'Set up face verification' : 'Verify your face';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle={Platform.OS === 'ios' ? 'fullScreen' : undefined}>
      <View className="flex-1 bg-bg px-5 pb-6 pt-20">
        <Text className="text-[22px] font-extrabold text-ink">{title}</Text>
        <Muted className="mt-1 text-[14px] leading-4">
          {mode === 'enrol'
            ? 'Your camera captures are only used to create an encrypted facial template. Photos are not kept.'
            : 'Complete the live camera step. Do not use a photograph, a video or another screen.'}
        </Muted>

        <View className="mt-5 items-center">
          <View style={{ width: 300, height: 300, borderRadius: 150, overflow: 'hidden', backgroundColor: '#0B1220', borderWidth: 4, borderColor: images.length === requiredShots ? colors.green : colors.navy }}>
            {permission?.granted && visible ? (
              <CameraView ref={camera} style={{ flex: 1 }} facing="front" onCameraReady={() => setReady(true)} />
            ) : (
              <View className="flex-1 items-center justify-center px-6">
                {permission === null ? <ActivityIndicator color="#fff" /> : <Text className="text-center text-[13px] text-white">Camera access is needed for face verification.</Text>}
              </View>
            )}
          </View>
          <View className="mt-4 flex-row gap-2">
            {Array.from({ length: requiredShots }).map((_, i) => (
              <View key={i} className="h-2.5 w-10 rounded-full" style={{ backgroundColor: i < images.length ? colors.green : i === images.length ? colors.navy : '#D5DBE5' }} />
            ))}
          </View>
        </View>

        <Text className="mt-4 text-center text-[16px] text-ink">
          <Text className="font-extrabold">Step {Math.min(images.length + 1, requiredShots)} of {requiredShots}: </Text>
          {loading ? 'Preparing…' : step}
        </Text>

        {denied ? (
          <View className="mt-3">
            <Alert tone="warn">Camera permission is required for face verification.</Alert>
            {permission.canAskAgain
              ? <Button className="mt-2" icon="camera-outline" title="Allow camera" onPress={() => void requestPermission()} />
              : <Muted className="mt-2 text-center">Turn on Camera for NASRDA Attendance in your phone settings, then come back.</Muted>}
          </View>
        ) : null}
        {error ? <Alert tone="error" className="mt-3">{error}</Alert> : null}

        <View className="flex-1" />
        <ButtonRow>
          <Button variant="secondary" title="Cancel" disabled={busy} onPress={onClose} />
          <Button icon="camera-outline" title={busy ? 'Please wait…' : last ? 'Verify now' : 'Capture photo'} loading={busy}
            disabled={busy || loading || !steps.length || !ready || !permission?.granted} onPress={capture} />
        </ButtonRow>
      </View>
    </Modal>
  );
}