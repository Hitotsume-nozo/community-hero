import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Camera, Sparkles, MapPin, Crosshair, ArrowRight, ArrowLeft, AlertTriangle, Check, Image as ImageIcon } from 'lucide-react';
import { api, Analysis, Issue } from '../lib/api';
import { CATEGORY_UI, severityColor, severityLabel, cls } from '../lib/ui';
import { useApp } from '../lib/store';
import { GeminiBadge, Spinner } from '../components/atoms';

// downscale an image file to a JPEG data URL (keeps payloads small & fast)
function downscale(file: File, maxDim = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}

const pin = L.divIcon({ className: '', html: `<div class="pin pulse" style="background:#4f46e5;color:#4f46e5"><span>📍</span></div>`, iconSize: [30, 30], iconAnchor: [15, 28] });

function Recenter({ pos }: { pos: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(pos, map.getZoom()); }, [pos[0], pos[1]]);
  return null;
}
function ClickToSet({ onSet }: { onSet: (p: [number, number]) => void }) {
  useMapEvents({ click: (e) => onSet([e.latlng.lat, e.latlng.lng]) });
  return null;
}

export default function ReportPage() {
  const { user, config, toast, refreshUser } = useApp();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [photo, setPhoto] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [ai, setAi] = useState<Analysis | null>(null);

  // editable fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('other');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState(3);

  const [pos, setPos] = useState<[number, number]>([12.9568, 77.64]);
  const [address, setAddress] = useState('');
  const [nearby, setNearby] = useState<Issue[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (config) setPos([config.cityCenter.lat, config.cityCenter.lng]); }, [config]);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const dataUrl = await downscale(f);
    setPhoto(dataUrl);
    runAnalysis(dataUrl, description);
  }

  async function runAnalysis(dataUrl: string | null, text: string) {
    setAnalyzing(true); setAi(null);
    try {
      const base64 = dataUrl ? dataUrl.split(',')[1] : undefined;
      const r = await api.analyze({ base64, mime: dataUrl ? 'image/jpeg' : undefined, text: text || undefined });
      setAi(r);
      setTitle(r.title); setCategory(r.category); setSeverity(r.severity);
      if (r.description && !text) setDescription(r.description);
      if (r.isCivicIssue === false) toast('Hmm, that may not be a civic issue — please review.', 'error');
      else toast(`AI detected: ${r.title}`, 'success');
      setStep(2);
    } catch (e: any) {
      toast(e.message || 'Analysis failed', 'error');
      setStep(2);
    } finally { setAnalyzing(false); }
  }

  function geolocate() {
    if (!navigator.geolocation) return toast('Geolocation unavailable', 'error');
    navigator.geolocation.getCurrentPosition(
      (p) => { setPos([p.coords.latitude, p.coords.longitude]); toast('📍 Located you', 'success'); },
      () => toast('Location permission denied — drag the pin instead', 'error'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  // fetch nearby duplicates when entering step 3 / moving pin
  useEffect(() => {
    if (step !== 3) return;
    api.nearby(pos[0], pos[1], category).then(setNearby).catch(() => {});
  }, [step, pos[0], pos[1], category]);

  async function submit() {
    if (!user) return;
    setSubmitting(true);
    try {
      const { issue, duplicateOf } = await api.createIssue({
        reporterId: user.id, title, category, description, severity,
        lat: pos[0], lng: pos[1], address, photoUrl: photo,
        analysis: ai ? { ...ai } : undefined,
      });
      await refreshUser();
      if (duplicateOf) toast(`Submitted! Similar report exists ${duplicateOf.distance}m away.`, 'info');
      else toast('Report submitted! +10 civic points 🎉', 'success');
      navigate(`/issue/${issue.id}`);
    } catch (e: any) { toast(e.message || 'Submit failed', 'error'); }
    finally { setSubmitting(false); }
  }

  const steps = ['Capture', 'AI Details', 'Locate'];

  return (
    <div className="mx-auto h-full max-w-2xl overflow-y-auto px-4 pb-24 pt-4">
      {/* progress */}
      <div className="mb-5 flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div className={cls('flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold', step > i + 1 ? 'bg-emerald-500 text-white' : step === i + 1 ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500')}>
              {step > i + 1 ? <Check size={15} /> : i + 1}
            </div>
            <span className={cls('text-xs font-semibold', step === i + 1 ? 'text-slate-800' : 'text-slate-400')}>{s}</span>
            {i < steps.length - 1 && <div className="h-px flex-1 bg-slate-200" />}
          </div>
        ))}
      </div>

      {/* STEP 1 — capture */}
      {step === 1 && (
        <div className="animate-in space-y-4">
          <h1 className="text-2xl font-extrabold">Report a community issue</h1>
          <p className="text-sm text-slate-500">Snap a photo — Google Gemini will auto-detect the problem, category and severity for you.</p>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPhoto} className="hidden" />
          <button onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-brand-300 bg-brand-50 py-14 text-brand-700 transition hover:bg-brand-100">
            <Camera size={40} />
            <span className="font-bold">Take / upload a photo</span>
            <span className="flex items-center gap-1 text-xs font-semibold"><Sparkles size={13} /> Powered by Gemini Vision</span>
          </button>
          <div className="flex items-center gap-3 text-xs text-slate-400"><div className="h-px flex-1 bg-slate-200" /> or describe it <div className="h-px flex-1 bg-slate-200" /></div>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="e.g. Large pothole near the bus stop, water collects in it…"
            className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-brand-400" />
          <button onClick={() => runAnalysis(null, description)} disabled={!description.trim() || analyzing}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 py-3 font-semibold text-white disabled:opacity-40">
            {analyzing ? <Spinner label="Analyzing…" /> : <><ImageIcon size={18} /> Analyze description</>}
          </button>
        </div>
      )}

      {/* STEP 2 — AI details */}
      {step === 2 && (
        <div className="animate-in space-y-4">
          {photo && <img src={photo} className="max-h-60 w-full rounded-2xl object-cover" alt="report" />}
          {analyzing ? (
            <div className="flex items-center justify-center gap-3 rounded-2xl bg-brand-50 py-8 text-brand-700"><Spinner label="Gemini is analyzing your report…" /></div>
          ) : ai && (
            <div className="rounded-2xl border p-3" style={{ borderColor: severityColor(severity) + '66', background: severityColor(severity) + '0f' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold"><Sparkles size={15} /> AI Analysis <GeminiBadge source={ai.source} /></div>
                <span className="text-xs font-semibold text-slate-500">{Math.round(ai.confidence * 100)}% confident</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{ai.summary}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ai.tags.map((t) => <span key={t} className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">#{t}</span>)}
              </div>
            </div>
          )}

          <Field label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} className="inp" /></Field>
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="inp">
              {config?.categories.map((c) => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
            </select>
          </Field>
          <Field label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="inp" /></Field>
          <Field label={`Severity — ${severityLabel(severity)} (${severity}/5)`}>
            <input type="range" min={1} max={5} value={severity} onChange={(e) => setSeverity(+e.target.value)} className="w-full accent-brand-600" style={{ accentColor: severityColor(severity) }} />
          </Field>

          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="flex items-center gap-1 rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-600"><ArrowLeft size={18} /> Back</button>
            <button onClick={() => setStep(3)} disabled={!title.trim()} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 font-bold text-white disabled:opacity-40">Next: Location <ArrowRight size={18} /></button>
          </div>
        </div>
      )}

      {/* STEP 3 — location */}
      {step === 3 && (
        <div className="animate-in space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Where is it?</h2>
            <button onClick={geolocate} className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700"><Crosshair size={15} /> Use my location</button>
          </div>
          <p className="text-xs text-slate-500">Tap the map or drag the pin to the exact spot.</p>
          <div className="h-64 overflow-hidden rounded-2xl border border-slate-200">
            <MapContainer center={pos} zoom={15} className="h-full w-full">
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
              <Recenter pos={pos} />
              <ClickToSet onSet={setPos} />
              <Marker position={pos} icon={pin} draggable eventHandlers={{ dragend: (e) => { const m = e.target as L.Marker; const ll = m.getLatLng(); setPos([ll.lat, ll.lng]); } }} />
            </MapContainer>
          </div>
          <Field label="Landmark / address (optional)"><input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Near Sony World Signal" className="inp" /></Field>

          {nearby.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-800"><AlertTriangle size={16} /> Possible duplicates nearby</div>
              <p className="mb-2 text-xs text-amber-700">If it’s the same problem, confirm the existing one instead — it carries more weight.</p>
              <div className="space-y-1.5">
                {nearby.map((n) => (
                  <button key={n.id} onClick={() => navigate(`/issue/${n.id}`)} className="flex w-full items-center gap-2 rounded-lg bg-white px-3 py-2 text-left text-sm shadow-sm hover:bg-amber-100/40">
                    <span>{CATEGORY_UI[n.category].emoji}</span>
                    <span className="flex-1 truncate font-medium">{n.title}</span>
                    <span className="text-xs text-slate-400">{n.distance}m</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="flex items-center gap-1 rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-600"><ArrowLeft size={18} /> Back</button>
            <button onClick={submit} disabled={submitting} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-bold text-white disabled:opacity-50">
              {submitting ? <Spinner /> : <><Check size={18} /> Submit report</>}
            </button>
          </div>
        </div>
      )}

      <style>{`.inp{width:100%;border:1px solid #e2e8f0;border-radius:.75rem;padding:.6rem .75rem;font-size:14px;outline:none}.inp:focus{border-color:#6366f1}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>{children}</label>;
}
