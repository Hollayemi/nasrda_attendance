import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert as NativeAlert, Pressable, ScrollView, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Icon, Muted, MultiSelect, Select, Sheet, TextField } from '@/components/ui';
import { OsmMap, type MapPt, type MapScene, type MapShape, type OsmMapHandle } from '@/components/map/OsmMap';
import { RequirePerm } from '@/hooks/useRequire';
import { api, errorOf } from '@/lib/api';
import { colors, shadow } from '@/theme';
import type { Campus, CampusArea, Department, Geofence as Fence } from '@/types';

type Pt = [number, number];
type Mode = 'idle' | 'area' | 'building';
const ABUJA: Pt = [9.0765, 7.3986];

export default function Geofence() {
  return <RequirePerm perm="can_manage_geofence"><Inner /></RequirePerm>;
}

function Inner() {
  const qc = useQueryClient();
  const map = useRef<OsmMapHandle>(null);
  const { data: campuses = [] } = useQuery({ queryKey: ['campuses'], queryFn: () => api.get('/admin/campuses/').then((r) => r.data as Campus[]) });
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: () => api.get('/admin/departments/').then((r) => r.data as Department[]) });
  const [campusId, setCampusId] = useState<number | ''>('');
  const [mode, setMode] = useState<Mode>('idle');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [pts, setPts] = useState<Pt[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [buildingAreaId, setBuildingAreaId] = useState<number | ''>('');
  const [departmentIds, setDepartmentIds] = useState<number[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [satellite, setSatellite] = useState(true);

  const campus = campuses.find((c) => c.id === campusId);
  const selected = campus?.geofences.find((g) => g.id === selectedId);
  const selectedArea = campus?.areas.find((a) => a.id === selectedAreaId);
  const buildings = useMemo(() => campus?.geofences.filter((g) => g.kind === 'polygon') ?? [], [campus]);
  const campusDepartments = departments.filter((d) => campus?.department_ids.includes(d.id));
  const activePts = pts;
  const setActivePts = setPts;

  const reset = () => { setMode('idle'); setSelectedId(null); setName(''); setPts([]); setSelectedAreaId(null); setBuildingAreaId(''); setDepartmentIds([]); };

  // Switching campus clears any draft and flies the map to the campus (or its boundary).
  useEffect(() => {
    reset(); setMsg(null);
    if (!campus) return;
    const ring = campus.areas.flatMap((a) => a.boundary);
    if (ring.length) map.current?.fitTo(ring, { top: 60, right: 60, bottom: 60, left: 60 });
    else map.current?.flyTo([campus.latitude, campus.longitude], 17);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campusId]);

  const selectOffice = (fence: Fence) => {
    setMode('building'); setSelectedId(fence.id); setSelectedAreaId(null); setBuildingAreaId(fence.campus_area ?? ''); setName(fence.name); setPts(fence.polygon ?? []); setDepartmentIds(fence.department_ids ?? []); setMsg(null);
    if (fence.polygon?.length) map.current?.fitTo(fence.polygon, { top: 60, right: 60, bottom: 260, left: 60 });
  };
  const addOffice = () => {
    if (!campus?.areas.length) { setMsg({ ok: false, text: 'Add and save a campus area before adding a building.' }); return; }
    reset(); setMode('building'); setBuildingAreaId(campus.areas[0].id); setMsg(null);
  };
  const selectArea = (area: CampusArea) => {
    reset(); setMode('area'); setSelectedAreaId(area.id); setName(area.name); setPts(area.boundary); setMsg(null);
    if (area.boundary.length) map.current?.fitTo(area.boundary, { top: 60, right: 60, bottom: 260, left: 60 });
  };
  const addArea = () => { if (!campus) return; reset(); setMode('area'); setMsg(null); };

  const refreshCampuses = () => qc.invalidateQueries({ queryKey: ['campuses'] });

  const saveBuilding = async () => {
    if (!campusId || !name.trim() || !buildingAreaId) return;
    setSaving(true); setMsg(null);
    try {
      const payload = { name: name.trim(), polygon: pts, department_ids: departmentIds, campus_area: buildingAreaId, is_active: true };
      if (selectedId) await api.patch(`/admin/geofences/${selectedId}/`, payload);
      else { const { data } = await api.post('/admin/geofences/', { campus: campusId, kind: 'polygon', ...payload }); setSelectedId(data.id); }
      await refreshCampuses(); setMsg({ ok: true, text: 'Office geofence saved.' });
    } catch (e) { setMsg({ ok: false, text: errorOf(e).message }); } finally { setSaving(false); }
  };
  const saveArea = async () => {
    if (!campus || !name.trim() || pts.length < 3) return;
    setSaving(true); setMsg(null);
    try {
      const payload = { campus: campus.id, name: name.trim(), boundary: pts, is_active: selectedArea?.is_active ?? true };
      const { data } = selectedAreaId ? await api.patch(`/admin/campus-areas/${selectedAreaId}/`, payload) : await api.post('/admin/campus-areas/', payload);
      setSelectedAreaId(data.id); await refreshCampuses(); setMsg({ ok: true, text: 'Campus area saved.' });
    } catch (e) { setMsg({ ok: false, text: errorOf(e).message }); } finally { setSaving(false); }
  };
  const toggleArea = async () => {
    if (!selectedArea) return;
    setSaving(true); setMsg(null);
    try { await api.patch(`/admin/campus-areas/${selectedArea.id}/`, { is_active: !selectedArea.is_active }); await refreshCampuses(); setMsg({ ok: true, text: `Campus area ${selectedArea.is_active ? 'disabled' : 'enabled'}.` }); }
    catch (e) { setMsg({ ok: false, text: errorOf(e).message }); } finally { setSaving(false); }
  };
  const removeArea = () => {
    if (!selectedArea) return;
    NativeAlert.alert('Remove campus area?', `Remove ${selectedArea.name}? Remove its buildings first.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        setSaving(true); setMsg(null);
        try { await api.delete(`/admin/campus-areas/${selectedArea.id}/`); reset(); await refreshCampuses(); setMsg({ ok: true, text: 'Campus area removed.' }); }
        catch (e) { setMsg({ ok: false, text: errorOf(e).message }); } finally { setSaving(false); }
      } },
    ]);
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

  const centre: Pt = campus ? [campus.latitude, campus.longitude] : ABUJA;
  const drawing = mode !== 'idle';
  const isCircle = selected?.kind === 'circle';

  // Everything the map draws, rebuilt only when its inputs change.
  const scene = useMemo<MapScene>(() => {
    const shapes: MapShape[] = [];
    campus?.areas.filter((a) => a.id !== selectedAreaId && a.boundary.length >= 3).forEach((a) => shapes.push({
      id: `area-${a.id}`, points: a.boundary, weight: 3, fillOpacity: 0.06,
      color: a.is_active ? '#17803D' : '#C0392B', fill: a.is_active ? '#17803D' : '#C0392B',
    }));
    buildings.filter((f) => f.id !== selectedId && (f.polygon?.length ?? 0) >= 3).forEach((f) => shapes.push({
      id: `fence-${f.id}`, points: f.polygon!, weight: 2, fillOpacity: 0.14,
      color: f.is_active ? '#6B7A8C' : '#C0392B', fill: '#6B7A8C',
    }));
    if (mode === 'area' && pts.length >= 2) shapes.push({ id: 'draft', points: pts, weight: 3, fillOpacity: 0.14, color: '#17803D', fill: '#17803D' });
    if (mode === 'building' && pts.length >= 2) shapes.push({ id: 'draft', points: pts, weight: 3, fillOpacity: 0.22, color: colors.navy, fill: colors.navy });
    return { shapes, handles: drawing ? pts : [], satellite };
  }, [campus, buildings, selectedId, selectedAreaId, mode, pts, drawing, satellite]);

  const onMapTap = (p: MapPt) => {
    if (!drawing || (mode === 'building' && isCircle)) return;
    setActivePts((prev) => [...prev, p]);
  };
  const onMovePoint = (i: number, p: MapPt) => setActivePts((prev) => prev.map((q, j) => (j === i ? p : q)));

  return (
    <View className="flex-1 bg-surface">
      <View className="px-4 pb-2">
        <Select label="Campus" value={campusId} onChange={(v) => setCampusId(v)} placeholder="Select a campus…" options={campuses.map((c) => ({ value: c.id, label: c.name }))} />
        <View className="mt-2.5 flex-row gap-2">
          <View className="flex-1"><Button variant="secondary" size="sm" icon="add" title="New campus" onPress={() => setNewOpen(true)} /></View>
          {campusId ? (
            <>
              <View className="flex-1"><Button variant={mode === 'area' && !selectedAreaId ? 'primary' : 'secondary'} size="sm" icon="shapes-outline" title="+ Area" onPress={addArea} /></View>
              <View className="flex-1"><Button variant={mode === 'building' && !selectedId ? 'primary' : 'secondary'} size="sm" icon="business-outline" title="+ Building" disabled={!campus?.areas.length} onPress={addOffice} /></View>
            </>
          ) : null}
        </View>
        {msg ? <Alert tone={msg.ok ? 'success' : 'error'} className="mt-2">{msg.text}</Alert> : null}
        {campus ? (
          <>
            <Text className="mt-3 text-[12px] font-extrabold uppercase tracking-wide text-ink-muted">Campus areas</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-1.5" contentContainerStyle={{ gap: 8 }}>
              {campus.areas.map((a) => (
                <Pressable key={a.id} onPress={() => selectArea(a)} className={`max-w-[220px] rounded-xl border px-3 py-2 ${selectedAreaId === a.id ? 'border-navy bg-navy-50' : 'border-surface-input bg-white'}`}>
                  <Text numberOfLines={1} className="text-[13px] font-bold text-ink">{a.name}</Text>
                  <Text className="text-[11.5px] text-ink-muted">{a.is_active ? 'Active' : 'Disabled'}</Text>
                </Pressable>
              ))}
              {!campus.areas.length ? <Muted className="py-2">No campus areas have been added yet.</Muted> : null}
            </ScrollView>
            <Text className="mt-3 text-[12px] font-extrabold uppercase tracking-wide text-ink-muted">Buildings</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-1.5" contentContainerStyle={{ gap: 8 }}>
              {buildings.map((f) => (
                <Pressable key={f.id} onPress={() => selectOffice(f)} className={`max-w-[240px] rounded-xl border px-3 py-2 ${selectedId === f.id ? 'border-navy bg-navy-50' : 'border-surface-input bg-white'}`}>
                  <Text numberOfLines={1} className="text-[13px] font-bold text-ink">{f.name}{f.is_active ? '' : ' (off)'}</Text>
                  <Text numberOfLines={1} className="text-[11.5px] text-ink-muted">{f.campus_area_name || 'Unassigned area'} · {f.departments?.join(', ') || 'No departments assigned'}</Text>
                </Pressable>
              ))}
              {!buildings.length ? <Muted className="py-2">No buildings have been added yet.</Muted> : null}
            </ScrollView>
          </>
        ) : null}
      </View>

      {campusId ? (
        <View className="flex-1 overflow-hidden rounded-t-[24px]" style={shadow}>
          <OsmMap ref={map} center={centre} zoom={17} initialFit={campus?.areas.flatMap((a) => a.boundary)} scene={scene} onTap={onMapTap} onMovePoint={onMovePoint} />
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
              {mode === 'area' ? (
                <>
                  <TextField label={selectedArea ? `Edit ${selectedArea.name}` : 'Campus area name'} value={name} onChangeText={setName} placeholder="e.g. Annex, Main site" />
                  <Muted className="my-1.5">Draw the outer boundary of this physical location. Its buildings must stay inside it.</Muted>
                  <View className="flex-row gap-2">
                    <View className="flex-1"><Button variant="secondary" size="sm" icon="arrow-undo" title="Undo" disabled={!pts.length || saving} onPress={() => setPts(pts.slice(0, -1))} /></View>
                    <View className="flex-1"><Button variant="secondary" size="sm" icon="trash-outline" title="Clear" disabled={!pts.length || saving} onPress={() => setPts([])} /></View>
                    <View className="flex-1"><Button variant="secondary" size="sm" title="Cancel" disabled={saving} onPress={reset} /></View>
                  </View>
                  <Button className="mt-2.5" icon="save-outline" title="Save campus area" loading={saving} disabled={pts.length < 3 || !name.trim()} onPress={saveArea} />
                  {selectedArea ? (
                    <View className="mt-2 flex-row gap-2">
                      <View className="flex-1"><Button variant="secondary" size="sm" title={selectedArea.is_active ? 'Disable area' : 'Enable area'} disabled={saving} onPress={toggleArea} /></View>
                      <View className="flex-1"><Button variant="danger" size="sm" icon="trash-outline" title="Remove area" disabled={saving} onPress={removeArea} /></View>
                    </View>
                  ) : null}
                </>
              ) : isCircle ? (
                <Muted>This legacy circle cannot be used as a department building. Create a polygon building instead.</Muted>
              ) : (
                <>
                  <Select label="Campus area" value={buildingAreaId} onChange={(v) => setBuildingAreaId(v)} placeholder="Select campus area…" options={(campus?.areas ?? []).map((a) => ({ value: a.id, label: a.name }))} />
                  <TextField label={selected ? `Edit ${selected.name}` : 'Building name'} value={name} onChangeText={setName} placeholder="e.g. Admin Block" />
                  <MultiSelect label="Departments using this building" value={departmentIds} onChange={setDepartmentIds} placeholder="Select departments"
                    hint={campusDepartments.length ? undefined : 'No departments are assigned to this campus'} options={campusDepartments.map((d) => ({ value: d.id, label: d.name }))} />
                  <View className="mt-2 flex-row gap-2">
                    <View className="flex-1"><Button variant="secondary" size="sm" icon="arrow-undo" title="Undo" disabled={!pts.length || saving} onPress={() => setPts(pts.slice(0, -1))} /></View>
                    <View className="flex-1"><Button variant="secondary" size="sm" icon="trash-outline" title="Clear" disabled={!pts.length || saving} onPress={() => setPts([])} /></View>
                    <View className="flex-1"><Button variant="secondary" size="sm" title="Cancel" disabled={saving} onPress={reset} /></View>
                  </View>
                  <Button className="mt-2.5" icon="save-outline" title="Save building" loading={saving} disabled={pts.length < 3 || !name.trim() || !buildingAreaId || !departmentIds.length} onPress={saveBuilding} />
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
          <Muted className="text-center">Select a campus to manage its areas and buildings.</Muted>
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
    <Sheet visible={visible} onClose={onClose} title="New campus" subtitle="Use the campus's approximate centre. Add one or more named campus areas afterwards, then the department buildings inside them."
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