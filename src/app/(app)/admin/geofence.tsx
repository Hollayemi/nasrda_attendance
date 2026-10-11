import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import MapView, { Marker, Polygon, type LatLng } from 'react-native-maps';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Icon, Muted, Select, Sheet, TextField } from '@/components/ui';
import { RequirePerm } from '@/hooks/useRequire';
import { api, errorOf } from '@/lib/api';
import { colors, shadow } from '@/theme';
import type { Campus } from '@/types';

type Pt = [number, number];
const ABUJA: Pt = [9.0765, 7.3986];
const toLL = (p: Pt): LatLng => ({ latitude: p[0], longitude: p[1] });

export default function Geofence() {
  return <RequirePerm perm="can_manage_geofence"><Inner /></RequirePerm>;
}

function Inner() {
  const qc = useQueryClient();
  const map = useRef<MapView>(null);
  const { data: campuses = [] } = useQuery({ queryKey: ['campuses'], queryFn: () => api.get('/admin/campuses/').then((r) => r.data as Campus[]) });
  const [campusId, setCampusId] = useState<number | ''>('');
  const [pts, setPts] = useState<Pt[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [satellite, setSatellite] = useState(true);

  const campus = campuses.find((c) => c.id === campusId);
  const existing = campus?.geofences.find((g) => g.kind === 'polygon');
  const centre: Pt = campus ? [campus.latitude, campus.longitude] : ABUJA;

  // Load the campus's existing boundary and fly there when the selection changes.
  useEffect(() => {
    setPts(existing?.polygon ?? []); setMsg(null);
    if (campus) map.current?.animateToRegion({ latitude: campus.latitude, longitude: campus.longitude, latitudeDelta: 0.006, longitudeDelta: 0.006 }, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campusId]);

  const coords = useMemo(() => pts.map(toLL), [pts]);

  const save = async () => {
    if (!campusId) return;
    setSaving(true); setMsg(null);
    try {
      if (existing) await api.patch(`/admin/geofences/${existing.id}/`, { polygon: pts, is_active: true });
      else await api.post('/admin/geofences/', { campus: campusId, kind: 'polygon', polygon: pts, is_active: true });
      await qc.invalidateQueries({ queryKey: ['campuses'] });
      setMsg({ ok: true, text: 'Geofence saved.' });
    } catch (e) { setMsg({ ok: false, text: errorOf(e).message }); }
    finally { setSaving(false); }
  };

  return (
    <View className="flex-1 bg-surface">
      <View className="px-4 pb-2">
        <Select label="Campus" value={campusId} onChange={(v) => setCampusId(v)} placeholder="Select a campus…" options={campuses.map((c) => ({ value: c.id, label: c.name }))} />
        <View className="mt-2.5 flex-row gap-2">
          <View className="flex-1"><Button variant="secondary" size="sm" icon="add" title="New campus" onPress={() => setNewOpen(true)} /></View>
          {campusId ? (
            <>
              <View className="flex-1"><Button variant="secondary" size="sm" icon="arrow-undo" title="Undo" disabled={!pts.length} onPress={() => setPts(pts.slice(0, -1))} /></View>
              <View className="flex-1"><Button variant="secondary" size="sm" icon="trash-outline" title="Clear" disabled={!pts.length} onPress={() => setPts([])} /></View>
            </>
          ) : null}
        </View>
        {msg ? <Alert tone={msg.ok ? 'success' : 'error'} className="mt-2">{msg.text}</Alert> : null}
      </View>

      {campusId ? (
        <View className="flex-1 overflow-hidden rounded-t-[24px]" style={shadow}>
          <MapView ref={map} style={{ flex: 1 }} mapType={satellite ? 'hybrid' : 'standard'}
            initialRegion={{ latitude: centre[0], longitude: centre[1], latitudeDelta: 0.006, longitudeDelta: 0.006 }}
            onPress={(e) => { const c = e.nativeEvent.coordinate; setPts([...pts, [c.latitude, c.longitude]]); }}>
            {coords.length >= 3 ? <Polygon coordinates={coords} strokeColor={colors.navy} strokeWidth={3} fillColor="rgba(25,41,125,0.22)" /> : null}
            {coords.map((c, i) => (
              <Marker key={`${i}-${pts.length}`} coordinate={c} draggable anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}
                onDragEnd={(e) => { const n = e.nativeEvent.coordinate; setPts(pts.map((q, j) => (j === i ? [n.latitude, n.longitude] : q))); }}>
                <View className="h-[22px] w-[22px] items-center justify-center rounded-full border-[3px] border-white bg-navy" style={{ elevation: 4 }}>
                  <Text className="text-[9px] font-extrabold text-white">{i + 1}</Text>
                </View>
              </Marker>
            ))}
          </MapView>
          <Pressable onPress={() => setSatellite((s) => !s)} className="absolute right-3 top-3 h-11 w-11 items-center justify-center rounded-full bg-white active:opacity-80" style={shadow} accessibilityLabel="Toggle satellite view">
            <Icon name={satellite ? 'map-outline' : 'earth'} size={20} color={colors.navy} />
          </Pressable>
          <View className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-2" style={shadow}>
            <Text className="text-[12px] font-bold text-ink">{pts.length < 3 ? `Tap the map to add points (${pts.length}/3 min)` : `${pts.length} points · drag to adjust`}</Text>
          </View>
          <View className="absolute bottom-0 left-0 right-0 bg-white/95 px-4 pb-6 pt-3">
            <Button icon="save-outline" title="Save boundary" loading={saving} disabled={pts.length < 3} onPress={save} />
          </View>
        </View>
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <View className="mb-3 h-16 w-16 items-center justify-center rounded-full bg-navy-50"><Icon name="map-outline" size={28} color={colors.navy} /></View>
          <Muted className="text-center">Select a campus above to view or draw its attendance boundary.</Muted>
        </View>
      )}

      <NewCampusSheet visible={newOpen} onClose={() => setNewOpen(false)} onCreated={(id) => { setCampusId(id); setNewOpen(false); qc.invalidateQueries({ queryKey: ['campuses'] }); }} />
    </View>
  );
}

function NewCampusSheet({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: (id: number) => void }) {
  const [form, setForm] = useState({ name: '', latitude: '', longitude: '' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const create = async () => {
    setBusy(true); setMsg('');
    try {
      const { data } = await api.post('/admin/campuses/', { name: form.name, latitude: Number(form.latitude), longitude: Number(form.longitude), is_active: true });
      setForm({ name: '', latitude: '', longitude: '' }); onCreated(data.id);
    } catch (e) { setMsg(errorOf(e).message); } finally { setBusy(false); }
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="New campus" subtitle="Use the approximate centre — you'll draw the exact boundary on the map next."
      footer={<Button title="Create campus" loading={busy} disabled={!form.name || !form.latitude || !form.longitude} onPress={create} />}>
      <TextField label="Name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} />
      <View className="flex-row gap-3">
        <TextField className="flex-1" label="Latitude" keyboardType="numbers-and-punctuation" value={form.latitude} onChangeText={(latitude) => setForm({ ...form, latitude })} placeholder="9.0765" />
        <TextField className="flex-1" label="Longitude" keyboardType="numbers-and-punctuation" value={form.longitude} onChangeText={(longitude) => setForm({ ...form, longitude })} placeholder="7.3986" />
      </View>
      {msg ? <Alert tone="error" className="mt-3">{msg}</Alert> : null}
    </Sheet>
  );
}
