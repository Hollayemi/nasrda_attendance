import { useState } from 'react';
import { Text, View } from 'react-native';
import { Alert, Button, Card, Muted, Screen, TextField } from '@/components/ui';
import { api, errorOf } from '@/lib/api';

export default function ChangePassword() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const change = async () => {
    if (next !== confirm) return setMessage({ ok: false, text: 'The new password entries do not match.' });
    setBusy(true); setMessage(null);
    try {
      await api.post('/auth/change-password/', { current_password: current, new_password: next });
      setCurrent(''); setNext(''); setConfirm('');
      setMessage({ ok: true, text: 'Password changed successfully.' });
    } catch (e) { setMessage({ ok: false, text: errorOf(e).message }); }
    finally { setBusy(false); }
  };

  return (
    <Screen>
      <Card className="mt-2">
        <Text className="text-[18px] font-extrabold text-ink">Change password</Text>
        <Muted className="mt-0.5">You can choose any password you prefer.</Muted>
        <TextField label="Current password" icon="lock-closed-outline" secure value={current} onChangeText={setCurrent} autoCapitalize="none" textContentType="password" />
        <TextField label="New password" icon="key-outline" secure value={next} onChangeText={setNext} autoCapitalize="none" textContentType="newPassword" />
        <TextField label="Confirm new password" icon="key-outline" secure value={confirm} onChangeText={setConfirm} autoCapitalize="none" textContentType="newPassword" />
        {message ? <Alert tone={message.ok ? 'success' : 'error'} className="mt-3">{message.text}</Alert> : null}
        <View className="mt-4"><Button title={busy ? 'Changing…' : 'Change password'} loading={busy} disabled={!current || !next} onPress={change} /></View>
      </Card>
    </Screen>
  );
}
