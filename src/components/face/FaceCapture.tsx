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

/**
 * Live face capture, matching the web app:
 *  - enrol: the screen walks through three poses, but only the FIRST photo (looking straight ahead) is sent to
 *    /staff/face/enroll/ with this phone's device token. The other two steps are just for show.
 *  - verify: the server issues a challenge with a single step; that one photo goes to /attendance/face/verify/
 *    which returns a one-use verification id that the check-in / check-out request carries.
 * The photo is only used to build / compare the encrypted template and is not stored on the phone.
 */
export function FaceCapture({ visible, mode, action, onComplete, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [steps, setSteps] = useState<string[]>(mode === 'enrol' ? ENROL_STEPS : []);
  const [challengeId, setChallengeId] = useState('');
  const [images, setImages] = useState<string[]>([]); // only real photos that will be uploaded
  const [taken, setTaken] = useState(0); // steps completed on screen (can exceed images.length when enrolling)
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  // (Re)start whenever the sheet opens.
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    setImages([]); setTaken(0); setError(''); setReady(false); setChallengeId('');
    setSteps(mode === 'enrol' ? ENROL_STEPS : []);
    if (mode === 'verify') {
      setLoading(true);
      api.post('/attendance/face/challenge/', { action })
        .then(({ data }) => { if (alive) { setSteps(data.steps); setChallengeId(data.challenge_id); } })
        .catch((e) => alive && setError(errorOf(e).message))
        .finally(() => alive && setLoading(false));
    }
    return () => { alive = false; };
  }, [visible, mode, action]);

  // Enrolment shows three poses (only the first is uploaded); verification follows the server's challenge.
  const total = mode === 'enrol' ? ENROL_STEPS.length : Math.max(steps.length, 1);
  const step = steps[taken] ?? 'Preparing camera…';
  const last = taken === total - 1;

  const capture = async () => {
    if (!camera.current || !ready) return setError('Camera is still starting. Please wait.');
    setError(''); setBusy(true);
    try {
      // Enrolment steps 2 and 3 are visual only: advance without taking or sending another photo.
      if (mode === 'enrol' && taken > 0) {
        await new Promise((r) => setTimeout(r, 450));
        Haptics.selectionAsync().catch(() => {});
        const nextTaken = taken + 1;
        setTaken(nextTaken);
        if (nextTaken < total) return;
        await api.post('/staff/face/enroll/', { images: [images[0]], device_token: await deviceToken(), label: deviceLabel() });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onComplete();
        return;
      }
      const shot = await camera.current.takePictureAsync({ quality: 0.9, shutterSound: false, skipProcessing: false });
      // Keep uploads small (the web app sends ~540px frames).
      const small = await manipulateAsync(shot.uri, [{ resize: { width: 540 } }], { compress: 0.82, format: SaveFormat.JPEG, base64: true });
      if (!small.base64) throw new Error('Could not read the photo.');
      const next = [...images, `data:image/jpeg;base64,${small.base64}`];
      Haptics.selectionAsync().catch(() => {});
      setImages(next);
      setTaken(1);
      if (mode === 'enrol') return; // two more poses to go (visual only); the upload happens after the last one

      const { data } = await api.post('/attendance/face/verify/', { challenge_id: challengeId, images: next });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onComplete(data.verification_id);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setImages([]); setTaken(0); setError(errorOf(e).message);
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
      <View className="flex-1 bg-bg px-5 pb-6 pt-14">
        <Text className="text-[22px] font-extrabold text-ink">{title}</Text>
        <Muted className="mt-1">
          {mode === 'enrol'
            ? 'Your camera capture is only used to create an encrypted facial template. Photos are not kept.'
            : 'Look straight at the camera. Do not use a photograph, a video or another screen.'}
        </Muted>

        <View className="mt-5 items-center">
          <View style={{ width: 300, height: 300, borderRadius: 150, overflow: 'hidden', backgroundColor: '#0B1220', borderWidth: 4, borderColor: taken >= total ? colors.green : colors.navy }}>
            {permission?.granted && visible ? (
              <CameraView ref={camera} style={{ flex: 1 }} facing="front" onCameraReady={() => setReady(true)} />
            ) : (
              <View className="flex-1 items-center justify-center px-6">
                {permission === null ? <ActivityIndicator color="#fff" /> : <Text className="text-center text-[13px] text-white">Camera access is needed for face verification.</Text>}
              </View>
            )}
          </View>
          <View className="mt-4 flex-row gap-2">
            {Array.from({ length: total }, (_, i) => (
              <View key={i} className="h-2.5 w-10 rounded-full" style={{ backgroundColor: i < taken ? colors.green : i === taken ? colors.navy : '#D5DBE5' }} />
            ))}
          </View>
        </View>

        <Text className="mt-4 text-center text-[16px] text-ink">{total > 1 ? <Text className="font-extrabold">Step {Math.min(taken + 1, total)} of {total}: </Text> : <Text className="font-extrabold">Live camera check: </Text>}{loading ? 'Preparing…' : step}</Text>

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
          <Button icon="camera-outline" title={busy ? 'Please wait…' : mode === 'verify' ? 'Capture and verify' : last ? 'Finish setup' : 'Capture photo'} loading={busy}
            disabled={busy || loading || !steps.length || !ready || !permission?.granted} onPress={capture} />
        </ButtonRow>
      </View>
    </Modal>
  );
}
