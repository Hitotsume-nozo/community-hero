import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, AlertTriangle, Clock, ThumbsUp, ChevronRight } from 'lucide-react';
import { api, Issue, Status, subscribe } from '../lib/api';
import { CATEGORY_UI, STATUS_UI, severityColor, timeAgo, cls } from '../lib/ui';
import { useApp } from '../lib/store';
import { StatusBadge, Card, Spinner } from '../components/atoms';

const ageDays = (iso: string) => (Date.now() - new Date(iso).getTime()) / 864e5;
function priority(i: Issue) {
  const open = i.status !== 'resolved' && i.status !== 'rejected';
  return (open ? 1000 : 0) + i.severity * 100 + i.upvotes.length * 8 + Math.min(40, ageDays(i.createdAt));
}

export default function AuthorityPage() {
  const { user, toast } = useApp();
  const navigate = useNavigate();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'queue' | 'in_progress' | 'resolved'>('queue');

  async function load() { try { setIssues(await api.issues()); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  useEffect(() => subscribe(() => load()), []);

  async function setStatus(id: string, s: Status) {
    if (!user) return;
    try { await api.setStatus(id, user.id, s); await load(); toast(`Marked ${STATUS_UI[s].label}`, 'success'); }
    catch (e: any) { toast(e.message, 'error'); }
  }

  const open = issues.filter((i) => i.status !== 'resolved' && i.status !== 'rejected');
  const overdue = open.filter((i) => ageDays(i.createdAt) > i.ai.estimatedResolutionDays);
  const high = open.filter((i) => i.severity >= 4);

  const list = useMemo(() => {
    let l = issues.slice();
    if (tab === 'queue') l = l.filter((i) => i.status === 'reported' || i.status === 'verified');
    else if (tab === 'in_progress') l = l.filter((i) => i.status === 'in_progress');
    else l = l.filter((i) => i.status === 'resolved');
    return l.sort((a, b) => priority(b) - priority(a));
  }, [issues, tab]);

  if (loading) return <div className="grid h-full place-items-center"><Spinner label="Loading console…" /></div>;

  return (
    <div className="mx-auto h-full max-w-5xl overflow-y-auto px-4 pb-24 pt-4">
      <div className="flex items-center gap-2"><ShieldCheck className="text-teal-600" /><h1 className="text-2xl font-extrabold">Authority Console</h1><span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-700">BBMP</span></div>
      <p className="mb-5 text-sm text-slate-500">AI-prioritised triage queue — act on what matters most, track SLAs, and close the loop with citizens.</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Open issues" value={open.length} color="#3b82f6" icon={<Clock size={16} />} />
        <Stat label="High severity" value={high.length} color="#ef4444" icon={<AlertTriangle size={16} />} />
        <Stat label="SLA overdue" value={overdue.length} color="#f59e0b" icon={<Clock size={16} />} />
        <Stat label="Confirmations" value={open.reduce((a, i) => a + i.upvotes.length, 0)} color="#8b5cf6" icon={<ThumbsUp size={16} />} />
      </div>

      <div className="mt-5 mb-3 flex gap-2">
        {([['queue', 'New & Verified'], ['in_progress', 'In Progress'], ['resolved', 'Resolved']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={cls('rounded-lg px-3 py-1.5 text-sm font-semibold transition', tab === k ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 border border-slate-200')}>{label}</button>
        ))}
      </div>

      <div className="space-y-2">
        {list.length === 0 && <Card className="p-8 text-center text-sm text-slate-400">Nothing here right now. 🎉</Card>}
        {list.map((i) => {
          const od = i.status !== 'resolved' && ageDays(i.createdAt) > i.ai.estimatedResolutionDays;
          return (
            <Card key={i.id} className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-1.5 self-stretch rounded-full" style={{ background: severityColor(i.severity) }} />
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl" style={{ background: CATEGORY_UI[i.category].color + '1a' }}>{CATEGORY_UI[i.category].emoji}</div>
                <button onClick={() => navigate(`/issue/${i.id}`)} className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-bold text-slate-800">{i.title}</span>
                    {od && <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">OVERDUE</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                    <span>{i.ward}</span>·<span>{timeAgo(i.createdAt)}</span>·<span className="flex items-center gap-0.5"><ThumbsUp size={11} />{i.upvotes.length}</span>·<span>→ {i.ai.suggestedDepartment}</span>·<span>SLA {i.ai.estimatedResolutionDays}d</span>
                  </div>
                </button>
                <div className="hidden sm:block"><StatusBadge status={i.status} /></div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 pl-[4.4rem]">
                {nextActions(i.status).map((s) => (
                  <button key={s} onClick={() => setStatus(i.id, s)} className="rounded-lg px-2.5 py-1 text-xs font-bold text-white" style={{ background: STATUS_UI[s].dot }}>→ {STATUS_UI[s].label}</button>
                ))}
                <button onClick={() => navigate(`/issue/${i.id}`)} className="ml-auto flex items-center gap-0.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700">Details <ChevronRight size={13} /></button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function nextActions(status: Status): Status[] {
  switch (status) {
    case 'reported': return ['verified', 'in_progress', 'rejected'];
    case 'verified': return ['in_progress', 'rejected'];
    case 'in_progress': return ['resolved'];
    case 'resolved': return [];
    default: return ['verified'];
  }
}

function Stat({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <Card className="flex items-center gap-3 p-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg text-white" style={{ background: color }}>{icon}</div>
      <div><div className="text-xl font-extrabold leading-none">{value}</div><div className="text-xs text-slate-500">{label}</div></div>
    </Card>
  );
}
