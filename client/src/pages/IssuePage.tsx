import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { ThumbsUp, MessageSquare, FileText, Share2, ArrowLeft, ShieldCheck, Clock, MapPin, Building2, Copy, X, Sparkles } from 'lucide-react';
import { api, Issue, subscribe } from '../lib/api';
import { CATEGORY_UI, STATUS_UI, STATUS_ORDER, severityColor, severityLabel, timeAgo, cls } from '../lib/ui';
import { useApp } from '../lib/store';
import { StatusBadge, SeverityPill, GeminiBadge, Avatar, Spinner } from '../components/atoms';

const pin = (color: string) => L.divIcon({ className: '', html: `<div class="pin" style="background:${color};color:${color}"><span>📍</span></div>`, iconSize: [30, 30], iconAnchor: [15, 28] });

export default function IssuePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, config, toast, refreshUser } = useApp();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [comment, setComment] = useState('');
  const [draft, setDraft] = useState<{ text: string; source: string } | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() { if (id) try { setIssue(await api.issue(id)); } catch { toast('Issue not found', 'error'); navigate('/'); } }
  useEffect(() => { load(); }, [id]);
  useEffect(() => subscribe((t, d) => { if (d?.id === id) load(); }), [id]);

  if (!issue) return <div className="grid h-full place-items-center"><Spinner label="Loading issue…" /></div>;

  const cat = config?.categories.find((c) => c.key === issue.category);
  const catUi = CATEGORY_UI[issue.category];
  const isAuthority = user?.role === 'authority';
  const confirmed = user ? issue.upvotes.includes(user.id) : false;
  const isMine = user?.id === issue.reporterId;

  async function confirm() {
    if (!user) return; setBusy(true);
    try { await api.confirm(issue!.id, user.id); await load(); await refreshUser(); toast('Thanks for confirming! +5 points', 'success'); }
    catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  }
  async function addComment() {
    if (!user || !comment.trim()) return; setBusy(true);
    try { await api.comment(issue!.id, user.id, comment.trim()); setComment(''); await load(); await refreshUser(); }
    catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  }
  async function setStatus(s: any) {
    if (!user) return;
    try { await api.setStatus(issue!.id, user.id, s); await load(); toast(`Marked ${STATUS_UI[s as keyof typeof STATUS_UI].label}`, 'success'); }
    catch (e: any) { toast(e.message, 'error'); }
  }
  async function genComplaint() {
    setDrafting(true);
    try { setDraft(await api.complaint(issue!.id)); }
    catch (e: any) { toast(e.message, 'error'); } finally { setDrafting(false); }
  }
  function share() {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: issue!.title, url }).catch(() => {});
    else { navigator.clipboard.writeText(url); toast('Link copied', 'success'); }
  }

  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto px-4 pb-24 pt-4">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-700"><ArrowLeft size={16} /> Back</button>

      {/* header */}
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl" style={{ background: catUi.color + '1a' }}>{catUi.emoji}</div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold leading-tight">{issue.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="flex items-center gap-1"><MapPin size={12} /> {issue.address}</span>
            <span className="flex items-center gap-1"><Clock size={12} /> {timeAgo(issue.createdAt)}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={issue.status} size="md" /><SeverityPill severity={issue.severity} /><GeminiBadge source={issue.ai.source} />
          </div>
        </div>
      </div>

      {issue.photoUrl && <img src={issue.photoUrl} className="mt-4 max-h-80 w-full rounded-2xl object-cover" alt="" />}
      <p className="mt-4 text-[15px] leading-relaxed text-slate-700">{issue.description}</p>

      {issue.ai.duplicateOf && (
        <Link to={`/issue/${issue.ai.duplicateOf}`} className="mt-3 block rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          ⚠️ Flagged as possibly related to an earlier nearby report — view it →
        </Link>
      )}

      {/* AI analysis */}
      <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: severityColor(issue.severity) + '55', background: severityColor(issue.severity) + '0d' }}>
        <div className="flex items-center gap-2 text-sm font-bold"><Sparkles size={16} /> AI Triage <GeminiBadge source={issue.ai.source} /><span className="ml-auto text-xs font-semibold text-slate-500">{Math.round(issue.ai.confidence * 100)}% conf.</span></div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric icon={<Building2 size={15} />} label="Routed to" value={issue.ai.suggestedDepartment} />
          <Metric icon={<Clock size={15} />} label="Est. fix" value={`${issue.ai.estimatedResolutionDays} days`} />
          <Metric icon={<ShieldCheck size={15} />} label="Safety risk" value={issue.ai.safetyRisk} valueClass={issue.ai.safetyRisk === 'high' ? 'text-rose-600' : issue.ai.safetyRisk === 'medium' ? 'text-amber-600' : 'text-emerald-600'} />
          <Metric icon={<MapPin size={15} />} label="Category" value={cat?.label || issue.category} />
        </div>
      </div>

      {/* actions */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button onClick={confirm} disabled={busy || confirmed || isMine}
          className={cls('flex flex-col items-center gap-1 rounded-xl border py-3 text-sm font-bold transition', confirmed ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white hover:border-brand-300', (isMine) && 'opacity-50')}>
          <ThumbsUp size={18} /> {confirmed ? 'Confirmed' : 'I see this too'} <span className="text-xs font-normal text-slate-400">{issue.upvotes.length} confirms</span>
        </button>
        <button onClick={() => document.getElementById('comment-box')?.scrollIntoView({ behavior: 'smooth' })} className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold hover:border-brand-300">
          <MessageSquare size={18} /> Comment <span className="text-xs font-normal text-slate-400">{issue.comments.length}</span>
        </button>
        <button onClick={genComplaint} className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold hover:border-brand-300">
          <FileText size={18} /> AI Complaint <span className="text-xs font-normal text-slate-400">draft letter</span>
        </button>
        <button onClick={share} className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold hover:border-brand-300">
          <Share2 size={18} /> Share <span className="text-xs font-normal text-slate-400">amplify</span>
        </button>
      </div>

      {/* authority controls */}
      {isAuthority && (
        <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-teal-800"><ShieldCheck size={16} /> Authority controls</div>
          <div className="flex flex-wrap gap-2">
            {(['verified', 'in_progress', 'resolved', 'rejected'] as const).map((s) => (
              <button key={s} onClick={() => setStatus(s)} disabled={issue.status === s}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40" style={{ background: STATUS_UI[s].dot }}>
                Mark {STATUS_UI[s].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* map + timeline */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="h-48 overflow-hidden rounded-2xl border border-slate-200">
          <MapContainer center={[issue.lat, issue.lng]} zoom={15} className="h-full w-full" dragging={false} zoomControl={false} scrollWheelZoom={false}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
            <Marker position={[issue.lat, issue.lng]} icon={pin(catUi.color)} />
          </MapContainer>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 text-sm font-bold text-slate-700">Status timeline</div>
          <ol className="relative ml-2 border-l-2 border-slate-200">
            {issue.timeline.map((t, i) => (
              <li key={i} className="mb-3 ml-4">
                <span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full" style={{ background: STATUS_UI[t.status].dot }} />
                <div className="text-sm font-semibold" style={{ color: STATUS_UI[t.status].color }}>{STATUS_UI[t.status].label}</div>
                <div className="text-xs text-slate-500">{t.note}</div>
                <div className="text-[10px] text-slate-400">{new Date(t.at).toLocaleString()} · {t.by}</div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* progress bar */}
      <div className="mt-4 flex items-center gap-1">
        {STATUS_ORDER.map((s, i) => {
          const reached = STATUS_ORDER.indexOf(issue.status as any) >= i || issue.status === 'resolved';
          return <div key={s} className="flex-1">
            <div className="h-1.5 rounded-full" style={{ background: reached ? STATUS_UI[s].dot : '#e2e8f0' }} />
            <div className="mt-1 text-center text-[10px] font-semibold" style={{ color: reached ? STATUS_UI[s].color : '#94a3b8' }}>{STATUS_UI[s].label}</div>
          </div>;
        })}
      </div>

      {/* comments */}
      <div id="comment-box" className="mt-6">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold"><MessageSquare size={16} /> Community ({issue.comments.length})</div>
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-slate-100 px-2 py-1.5">
          <Avatar name={user?.name || '?'} color={user?.avatarColor} size={28} />
          <input value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addComment()} placeholder="Add a comment or update…" className="flex-1 bg-transparent text-sm outline-none" />
          <button onClick={addComment} disabled={busy || !comment.trim()} className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40">Post</button>
        </div>
        <div className="space-y-2">
          {issue.comments.slice().reverse().map((c) => (
            <div key={c.id} className="flex gap-2">
              <Avatar name={c.userName} size={30} />
              <div className="flex-1 rounded-xl bg-white p-2.5 shadow-sm">
                <div className="flex items-center justify-between"><span className="text-sm font-bold">{c.userName}</span><span className="text-[10px] text-slate-400">{timeAgo(c.createdAt)}</span></div>
                <p className="text-sm text-slate-600">{c.text}</p>
              </div>
            </div>
          ))}
          {issue.comments.length === 0 && <p className="py-4 text-center text-sm text-slate-400">Be the first to comment.</p>}
        </div>
      </div>

      {/* complaint modal */}
      {(drafting || draft) && (
        <div className="fixed inset-0 z-[1500] grid place-items-center bg-black/40 p-4" onClick={() => { setDraft(null); setDrafting(false); }}>
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2 font-bold"><FileText size={16} /> Official complaint draft {draft && <GeminiBadge source={draft.source} />}</div>
              <button onClick={() => { setDraft(null); setDrafting(false); }}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="p-4">
              {drafting ? <div className="grid place-items-center py-10"><Spinner label="Gemini is drafting your complaint…" /></div> : (
                <>
                  <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{draft?.text}</pre>
                  <button onClick={() => { navigator.clipboard.writeText(draft!.text); toast('Complaint copied — paste into email/grievance portal', 'success'); }}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 font-semibold text-white"><Copy size={16} /> Copy to clipboard</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ icon, label, value, valueClass }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-xl bg-white/70 p-2.5">
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{icon}{label}</div>
      <div className={cls('mt-0.5 text-sm font-bold capitalize', valueClass || 'text-slate-700')}>{value}</div>
    </div>
  );
}
