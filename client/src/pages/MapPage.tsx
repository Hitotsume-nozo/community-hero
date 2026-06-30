import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet.heat';
import { Flame, List, X, PlusCircle, Search, Radio } from 'lucide-react';
import { api, Issue, subscribe } from '../lib/api';
import { CATEGORY_UI, STATUS_UI, severityColor, cls } from '../lib/ui';
import { useApp } from '../lib/store';
import { IssueCard } from '../components/IssueCard';
import { Pill } from '../components/atoms';

function pinIcon(issue: Issue) {
  const c = CATEGORY_UI[issue.category];
  const pulse = issue.status === 'reported' ? 'pulse' : '';
  return L.divIcon({
    className: '',
    html: `<div class="pin ${pulse}" style="background:${c.color};color:${c.color}"><span>${c.emoji}</span></div>`,
    iconSize: [30, 30], iconAnchor: [15, 28], popupAnchor: [0, -28],
  });
}

function HeatLayer({ issues, on }: { issues: Issue[]; on: boolean }) {
  const map = useMap();
  const ref = useRef<any>(null);
  useEffect(() => {
    if (ref.current) { map.removeLayer(ref.current); ref.current = null; }
    if (on) {
      const pts = issues.map((i) => [i.lat, i.lng, Math.min(1, i.severity / 5)] as [number, number, number]);
      ref.current = (L as any).heatLayer(pts, { radius: 32, blur: 22, maxZoom: 16, gradient: { 0.3: '#22c55e', 0.6: '#f59e0b', 0.9: '#ef4444' } });
      ref.current.addTo(map);
    }
    return () => { if (ref.current) { map.removeLayer(ref.current); ref.current = null; } };
  }, [issues, on, map]);
  return null;
}

export default function MapPage() {
  const { config, toast } = useApp();
  const navigate = useNavigate();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [cat, setCat] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [q, setQ] = useState('');
  const [heat, setHeat] = useState(false);
  const [sheet, setSheet] = useState(false);

  async function loadIssues() {
    try { setIssues(await api.issues()); } catch (e: any) { toast(e.message, 'error'); }
  }
  useEffect(() => { loadIssues(); }, []);

  // live updates
  useEffect(() => {
    const unsub = subscribe((type, data) => {
      if (type === 'issue:new') { loadIssues(); toast(`📣 New report: ${data.title} (${data.ward})`, 'info'); }
      else if (type === 'issue:status' || type === 'issue:confirm') loadIssues();
    });
    return unsub;
  }, []);

  const filtered = useMemo(() => issues.filter((i) =>
    (!cat || i.category === cat) && (!status || i.status === status) &&
    (!q || (i.title + i.description + i.ward).toLowerCase().includes(q.toLowerCase()))
  ), [issues, cat, status, q]);

  const center = config ? [config.cityCenter.lat, config.cityCenter.lng] as [number, number] : [12.9568, 77.64] as [number, number];

  return (
    <div className="flex h-full">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-[23rem] shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <SidebarContent {...{ config, cat, setCat, status, setStatus, q, setQ, filtered }} />
      </aside>

      {/* Map */}
      <div className="relative min-w-0 flex-1">
        <MapContainer center={center} zoom={config?.cityCenter.zoom || 12} className="h-full w-full" zoomControl={false} preferCanvas>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <HeatLayer issues={filtered} on={heat} />
          {!heat && (
            <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
              {filtered.map((i) => (
                <Marker key={i.id} position={[i.lat, i.lng]} icon={pinIcon(i)}
                  eventHandlers={{ click: () => navigate(`/issue/${i.id}`) }} />
              ))}
            </MarkerClusterGroup>
          )}
        </MapContainer>

        {/* top overlay: live + heat toggle */}
        <div className="pointer-events-none absolute inset-x-0 top-3 z-[1000] flex items-center justify-between px-3">
          <span className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-700 shadow glass">
            <Radio size={13} className="text-emerald-500" /> {filtered.length} issues live
          </span>
          <button onClick={() => setHeat((h) => !h)}
            className={cls('pointer-events-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow', heat ? 'bg-orange-500 text-white' : 'bg-white/90 text-slate-700 glass')}>
            <Flame size={14} /> Heatmap
          </button>
        </div>

        {/* legend */}
        <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] hidden rounded-xl bg-white/90 p-2 text-[10px] shadow glass sm:block">
          <div className="mb-1 font-bold text-slate-600">Severity</div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => <span key={s} className="h-3 w-3 rounded-sm" style={{ background: severityColor(s) }} />)}
            <span className="ml-1 text-slate-500">low → critical</span>
          </div>
        </div>

        {/* mobile: list + report FAB */}
        <button onClick={() => setSheet(true)}
          className="absolute bottom-4 left-3 z-[1000] flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-lg md:hidden">
          <List size={16} /> {filtered.length}
        </button>
        <button onClick={() => navigate('/report')}
          className="absolute bottom-4 right-3 z-[1000] flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3 font-bold text-white shadow-lg transition hover:bg-brand-700">
          <PlusCircle size={20} /> Report
        </button>
      </div>

      {/* mobile bottom sheet */}
      {sheet && (
        <div className="fixed inset-0 z-[1400] md:hidden" onClick={() => setSheet(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[80%] flex-col rounded-t-3xl bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 pt-3">
              <div className="mx-auto h-1 w-10 rounded-full bg-slate-300" />
              <button onClick={() => setSheet(false)} className="absolute right-3 top-3 text-slate-400"><X size={20} /></button>
            </div>
            <SidebarContent {...{ config, cat, setCat, status, setStatus, q, setQ, filtered }} />
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarContent({ config, cat, setCat, status, setStatus, q, setQ, filtered }: any) {
  return (
    <>
      <div className="space-y-2.5 border-b border-slate-200 p-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search issues, areas…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <Pill active={!status} onClick={() => setStatus('')}>All</Pill>
          {(['reported', 'verified', 'in_progress', 'resolved'] as const).map((s) => (
            <Pill key={s} active={status === s} onClick={() => setStatus(status === s ? '' : s)} color={STATUS_UI[s].dot}>{STATUS_UI[s].label}</Pill>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <Pill active={!cat} onClick={() => setCat('')}>All types</Pill>
          {config?.categories.map((c: any) => (
            <Pill key={c.key} active={cat === c.key} onClick={() => setCat(cat === c.key ? '' : c.key)} color={CATEGORY_UI[c.key as keyof typeof CATEGORY_UI].color}>
              {c.emoji} {c.label.split(' ')[0]}
            </Pill>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3">
        {filtered.length === 0 && <div className="py-10 text-center text-sm text-slate-400">No issues match your filters.</div>}
        {filtered.map((i: Issue) => <IssueCard key={i.id} issue={i} />)}
      </div>
    </>
  );
}
