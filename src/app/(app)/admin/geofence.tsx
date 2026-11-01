import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert as NativeAlert, Pressable, ScrollView, Text, View } from 'react-native';
import MapView, { Marker, Polygon, type LatLng } from 'react-native-maps';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Icon, Muted, MultiSelect, Select, Sheet, TextField } from '@/components/ui';
import { RequirePerm } from '@/hooks/useRequire';
import { api, errorOf } from '@/lib/api';
import { colors, shadow } from '@/theme';
import type { Campus, Department, Geofence as Fence } from '@/types';

type Pt = [number, number];
type Mode = 'idle' | 'boundary' | 'building';
const ABUJA: Pt = [9.0765, 7.3986];
const toLL = (p: Pt): LatLng => ({ latitude: p[0], longitude: p[1] });

export default function Geofence() {
  return <RequirePerm perm="can_manage_geofence"><Inner /></RequirePerm>;
}

function Inner() {
  const qc = useQueryClient();
  const map = useRef<MapView>(null);
  const { data: campuses = [] } = useQuery({ queryKey: ['campuses'], queryFn: () => api.get('/admin/campuses/').then((r) => r.data as Campus[]) });
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: () => api.get('/admin/departments/').then((r) => r.data as Department[]) });
  const [campusId, setCampusId] = useState<number | ''>('');
  const [mode, setMode] = useState<Mode>('idle');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [pts, setPts] = useState<Pt[]>([]);
  const [boundaryPts, setBoundaryPts] = useState<Pt[]>([]);
  const [departmentIds, setDepartmentIds] = useState<number[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [satellite, setSatellite] = useState(true);

  const campus = campuses.find((c) => c.id === campusId);
  const selected = campus?.geofences.find((g) => g.id === selectedId);
  const campusDepartments = departments.filter((d) => campus?.department_ids.includes(d.id));
  const activePts = mode === 'boundary' ? boundaryPts : pts;
  const setActivePts = mode === 'boundary' ? setBoundaryPts : setPts;

  const reset = () => { setMode('idle'); setSelectedId(null); setName(''); setPts([]); setBoundaryPts([]); setDepartmentIds([]); };

  // Switching campus clears any draft and flies the map to the campus (or its boundary).
  useEffect(() => {
    reset(); setMsg(null);
    if (!campus) return;
    const ring = campus.boundary?.length ? campus.boundary.map(toLL) : null;
    if (ring) map.current?.fitToCoordinates(ring, { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true });
    else map.current?.animateToRegion({ latitude: campus.latitude, longitude: campus.longitude, latitudeDelta: 0.006, longitudeDelta: 0.006 }, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campusId]);

  const selectOffice = (fence: Fence) => {
    setMode('building'); setSelectedId(fence.id); setName(fence.name); setPts(fence.polygon ?? []); setDepartmentIds(fence.department_ids ?? []); setMsg(null);
    if (fence.polygon?.length) map.current?.fitToCoordinates(fence.polygon.map(toLL), { edgePadding: { top: 60, right: 60, bottom: 260, left: 60 }, animated: true });
  };
  const addOffice = () => {
    if (!campus?.boundary) { setMsg({ ok: false, text: 'Draw and save the campus boundary before adding a building.' }); return; }
    reset(); setMode('building'); setMsg(null);
  };
  const editBoundary = () => { if (!campus) return; reset(); setMode('boundary'); setBoundaryPts(campus.boundary ?? []); setMsg(null); };

  const refreshCampuses = () => qc.invalidateQueries({ queryKey: ['campuses'] });

  const saveBuilding = async () => {
    if (!campusId || !name.trim()) return;
    setSaving(true); setMsg(null);
    try {
      const payload = { name: name.trim(), polygon: pts, department_ids: departmentIds, is_active: true };
      if (selectedId) await api.patch(`/admin/geofences/${selectedId}/`, payload);
      else { const { data } = await api.post('/admin/geofences/', { campus: campusId, kind: 'polygon', ...payload }); setSelectedId(data.id); }
      await refreshCampuses(); setMsg({ ok: true, text: 'Office geofence saved.' });
    } catch (e) { setMsg({ ok: false, text: errorOf(e).message }); } finally { setSaving(false); }
  };
  const saveBoundary = async () => {
    if (!campus || boundaryPts.length < 3) return;
    setSaving(true); setMsg(null);
    try {
      await api.patch(`/admin/campuses/${campus.id}/`, { boundary: boundaryPts });
      await refreshCampuses(); reset(); setMsg({ ok: true, text: 'Campus boundary saved.' });
    } catch (e) { setMsg({ ok: false, text: errorOf(e).message }); } finally { setSaving(false); }
  };
  const removeBuilding = () => {
    if (!selected) return;
    NativeAlert.alert('Remove building?', `Remove the ${selected.name} geofence?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        setSaving(true); setMsg(null);
        try { await api.delete(`/admin/geofences/${selected.id}/`); reset(); await refreshCampuses(); setMsg({ ok: true, text: 'Building removed.' }); }
        catch (e) { setMsg({ ok: false, text: errorOf(e).message }); } finally { setSaving(false); }
      } },
    ]);
  };
  const toggleBuilding = async () => {
    if (!selected) return;
    setSaving(true); setMsg(null);
    try { await api.patch(`/admin/geofences/${selected.id}/`, { is_active: !selected.is_active }); await refreshCampuses(); setMsg({ ok: true, text: `Building ${selected.is_active ? 'disabled' : 'enabled'}.` }); }
    catch (e) { setMsg({ ok: false, text: errorOf(e).message }); } finally { setSaving(false); }
  };

  const coords = useMemo(() => activePts.map(toLL), [activePts]);
  const centre: Pt = campus ? [campus.latitude, campus.longitude] : ABUJA;
  const drawing = mode !== 'idle';
  const isCircle = selected?.kind === 'circle';

  return (
    <View className="flex-1 bg-surface">
      <View className="px-4 pb-2">
        <Select label="Campus" value={campusId} onChange={(v) => setCampusId(v)} placeholder="Select a campus…" options={campuses.map((c) => ({ value: c.id, label: c.name }))} />
        <View className="mt-2.5 flex-row gap-2">
          <View className="flex-1"><Button variant="secondary" size="sm" icon="add" title="New campus" onPress={() => setNewOpen(true)} /></View>
          {campusId ? (
            <>
              <View className="flex-1"><Button variant={mode === 'boundary' ? 'primary' : 'secondary'} size="sm" icon="shapes-outline" title="Campus boundary" onPress={editBoundary} /></View>
              <View className="flex-1"><Button variant={mode === 'building' && !selectedId ? 'primary' : 'secondary'} size="sm" icon="business-outline" title="+ Building" disabled={!campus?.boundary} onPress={addOffice} /></View>
            </>
          ) : null}
        </View>
        {msg ? <Alert tone={msg.ok ? 'success' : 'error'} className="mt-2">{msg.text}</Alert> : null}
        {campus ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2.5" contentContainerStyle={{ gap: 8 }}>
            {campus.geofences.map((f) => (
              <Pressable key={f.id} onPress={() => selectOffice(f)} className={`max-w-[220px] rounded-xl border px-3 py-2 ${selectedId === f.id ? 'border-navy bg-navy-50' : 'border-surface-input bg-white'}`}>
                <Text numberOfLines={1} className="text-[13px] font-bold text-ink">{f.name}{f.is_active ? '' : ' (off)'}</Text>
                <Text numberOfLines={1} className="text-[11.5px] text-ink-muted">{f.departments?.join(', ') || 'No departments assigned'}</Text>
              </Pressable>
            ))}
            {!campus.geofences.length ? <Muted className="py-2">No buildings have been added yet.</Muted> : null}
          </ScrollView>
        ) : null}
      </View>

      {campusId ? (
        <View className="flex-1 overflow-hidden rounded-t-[24px]" style={shadow}>
          <MapView ref={map} style={{ flex: 1 }} mapType={satellite ? 'hybrid' : 'standard'}
            initialRegion={{ latitude: centre[0], longitude: centre[1], latitudeDelta: 0.006, longitudeDelta: 0.006 }}
            onPress={(e) => { if (!drawing || (mode === 'building' && isCircle)) return; const c = e.nativeEvent.coordinate; setActivePts([...activePts, [c.latitude, c.longitude]]); }}>
            {campus?.boundary && mode !== 'boundary' ? <Polygon coordinates={campus.boundary.map(toLL)} strokeColor="#17803D" strokeWidth={3} fillColor="rgba(23,128,61,0.06)" /> : null}
            {mode === 'boundary' && boundaryPts.length >= 3 ? <Polygon coordinates={boundaryPts.map(toLL)} strokeColor="#17803D" strokeWidth={3} fillColor="rgba(23,128,61,0.14)" /> : null}
            {campus?.geofences.filter((f) => f.id !== selectedId && f.kind === 'polygon' && (f.polygon?.length ?? 0) >= 3).map((f) => (
              <Polygon key={f.id} coordinates={f.polygon!.map(toLL)} strokeColor={f.is_active ? '#6B7A8C' : '#C0392B'} strokeWidth={2} fillColor="rgba(107,122,140,0.14)" />
            ))}
            {mode === 'building' && pts.length >= 3 ? <Polygon coordinates={pts.map(toLL)} strokeColor={colors.navy} strokeWidth={3} fillColor="rgba(25,41,125,0.22)" /> : null}
            {drawing ? coords.map((c, i) => (
              <Marker key={`${mode}-${i}-${activePts.length}`} coordinate={c} draggable anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}
                onDragEnd={(e) => { const n = e.nativeEvent.coordinate; setActivePts(activePts.map((q, j) => (j === i ? [n.latitude, n.longitude] : q))); }}>
                <View className="h-[22px] w-[22px] items-center justify-center rounded-full border-[3px] border-white bg-navy" style={{ elevation: 4 }}>
                  <Text className="text-[9px] font-extrabold text-white">{i + 1}</Text>
                </View>
              </Marker>
            )) : null}
          </MapView>
          <Pressable onPress={() => setSatellite((s) => !s)} className="absolute right-3 top-3 h-11 w-11 items-center justify-center rounded-full bg-white active:opacity-80" style={shadow} accessibilityLabel="Toggle satellite view">
            <Icon name={satellite ? 'map-outline' : 'earth'} size={20} color={colors.navy} />
          </Pressable>
          {drawing ? (
            <View className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-2" style={shadow}>
              <Text className="text-[12px] font-bold text-ink">{activePts.length < 3 ? `Tap the map to add points (${activePts.length}/3 min)` : `${activePts.length} points · drag to adjust`}</Text>
            </View>
          ) : null}

          {drawing ? (
            <View className="absolute bottom-0 left-0 right-0 bg-white/95 px-4 pb-6 pt-3">
              {mode === 'boundary' ? (
                <>
                  <Muted className="mb-2">Draw the outer boundary of the campus. Every building must remain inside it.</Muted>
                  <View className="flex-row gap-2">
                    <View className="flex-1"><Button variant="secondary" size="sm" icon="arrow-undo" title="Undo" disabled={!boundaryPts.length || saving} onPress={() => setBoundaryPts(boundaryPts.slice(0, -1))} /></View>
                    <View className="flex-1"><Button variant="secondary" size="sm" icon="trash-outline" title="Clear" disabled={!boundaryPts.length || saving} onPress={() => setBoundaryPts([])} /></View>
                    <View className="flex-1"><Button variant="secondary" size="sm" title="Cancel" disabled={saving} onPress={reset} /></View>
                  </View>
                  <Button className="mt-2.5" icon="save-outline" title="Save campus boundary" loading={saving} disabled={boundaryPts.length < 3} onPress={saveBoundary} />
                </>
              ) : isCircle ? (
                <Muted>This legacy circle cannot be used as a department building. Create a polygon building instead.</Muted>
              ) : (
                <>
                  <TextField label={selected ? `Edit ${selected.name}` : 'Building name'} value={name} onChangeText={setName} placeholder="e.g. Admin Block" />
                  <MultiSelect label="Departments using this building" value={departmentIds} onChange={setDepartmentIds} placeholder="Select departments"
                    hint={campusDepartments.length ? undefined : 'No departments are assigned to this campus'} options={campusDepartments.map((d) => ({ value: d.id, label: d.name }))} />
                  <View className="mt-2 flex-row gap-2">
                    <View className="flex-1"><Button variant="secondary" size="sm" icon="arrow-undo" title="Undo" disabled={!pts.length || saving} onPress={() => setPts(pts.slice(0, -1))} /></View>
                    <View className="flex-1"><Button variant="secondary" size="sm" icon="trash-outline" title="Clear" disabled={!pts.length || saving} onPress={() => setPts([])} /></View>
                    <View className="flex-1"><Button variant="secondary" size="sm" title="Cancel" disabled={saving} onPress={reset} /></View>
                  </View>
                  <Button className="mt-2.5" icon="save-outline" title="Save building" loading={saving} disabled={pts.length < 3 || !name.trim() || !departmentIds.length} onPress={saveBuilding} />
                  {selected ? (
                    <View className="mt-2 flex-row gap-2">
                      <View className="flex-1"><Button variant="secondary" size="sm" title={selected.is_active ? 'Disable building' : 'Enable building'} disabled={saving} onPress={toggleBuilding} /></View>
                      <View className="flex-1"><Button variant="danger" size="sm" icon="trash-outline" title="Remove building" disabled={saving} onPress={removeBuilding} /></View>
                    </View>
                  ) : null}
                </>
              )}
            </View>
          ) : null}
        </View>
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <View className="mb-3 h-16 w-16 items-center justify-center rounded-full bg-navy-50"><Icon name="map-outline" size={28} color={colors.navy} /></View>
          <Muted className="text-center">Select a campus to draw its boundary and manage its buildings.</Muted>
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
      const { data } = await api.post('/admin/campuses/', { name: form.name.trim(), latitude: Number(form.latitude), longitude: Number(form.longitude), is_active: true });
      setForm({ name: '', latitude: '', longitude: '' }); onCreated(data.id);
    } catch (e) { setMsg(errorOf(e).message); } finally { setBusy(false); }
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="New campus" subtitle="Use the campus's approximate centre. You can add separate office boundaries afterwards."
      footer={<Button title={busy ? 'Creating…' : 'Create campus'} loading={busy} disabled={!form.name.trim() || !form.latitude || !form.longitude} onPress={create} />}>
      <TextField label="Campus name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder="e.g. NASRDA Headquarters" />
      <View className="flex-row gap-3">
        <TextField className="flex-1" label="Latitude" keyboardType="numbers-and-punctuation" value={form.latitude} onChangeText={(latitude) => setForm({ ...form, latitude })} placeholder="e.g. 9.0579" />
        <TextField className="flex-1" label="Longitude" keyboardType="numbers-and-punctuation" value={form.longitude} onChangeText={(longitude) => setForm({ ...form, longitude })} placeholder="e.g. 7.4951" />
      </View>
      {msg ? <Alert tone="error" className="mt-3">{msg}</Alert> : null}
    </Sheet>
  );
}
