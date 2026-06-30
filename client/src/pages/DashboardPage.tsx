import { useEffect, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell, PieChart, Pie, Legend } from 'recharts';
import { TrendingUp, CheckCircle2, Clock, Users, Sparkles, AlertTriangle, Lightbulb } from 'lucide-react';
import { api, Stats, Insights } from '../lib/api';
import { CATEGORY_UI, STATUS_UI, severityColor, cls } from '../lib/ui';
import { GeminiBadge, Spinner, Card } from '../components/atoms';

const STATUS_KEYS = ['reported', 'verified', 'in_progress', 'resolved', 'rejected'] as const;

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loadingIns, setLoadingIns] = useState(true);

  useEffect(() => {
    api.stats().then(setStats).catch(() => {});
    api.insights().then(setInsights).finally(() => setLoadingIns(false));
  }, []);

  if (!stats) return <div className="grid h-full place-items-center"><Spinner label="Crunching impact data…" /></div>;

  const statusData = STATUS_KEYS.map((s) => ({ name: STATUS_UI[s].label, value: stats.byStatus[s] || 0, color: STATUS_UI[s].dot }));

  return (
    <div className="mx-auto h-full max-w-6xl overflow-y-auto px-4 pb-24 pt-4">
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-2xl font-extrabold">Impact Dashboard</h1>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">Bengaluru</span>
      </div>
      <p className="mb-5 text-sm text-slate-500">Transparency at a glance — what’s reported, verified and resolved across the city.</p>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi icon={<TrendingUp />} label="Total reports" value={stats.total} tone="brand" />
        <Kpi icon={<CheckCircle2 />} label="Resolution rate" value={`${stats.resolutionRate}%`} sub={`${stats.resolved} resolved`} tone="emerald" />
        <Kpi icon={<Clock />} label="Avg. resolution" value={`${stats.avgResolutionDays}d`} sub={`${stats.inProgress} in progress`} tone="amber" />
        <Kpi icon={<Users />} label="Confirmations" value={stats.totalConfirmations} sub={`${stats.aiAnalyzed} AI-analyzed`} tone="violet" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Trend */}
        <Card className="p-4 lg:col-span-2">
          <h3 className="mb-3 text-sm font-bold text-slate-700">Reports vs Resolutions — last 30 days</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats.trend} margin={{ left: -20, right: 8 }}>
              <defs>
                <linearGradient id="r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6366f1" stopOpacity={0.5} /><stop offset="1" stopColor="#6366f1" stopOpacity={0} /></linearGradient>
                <linearGradient id="d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#22c55e" stopOpacity={0.5} /><stop offset="1" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(8)} tick={{ fontSize: 10, fill: '#94a3b8' }} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="reported" stroke="#6366f1" fill="url(#r)" strokeWidth={2} name="Reported" />
              <Area type="monotone" dataKey="resolved" stroke="#22c55e" fill="url(#d)" strokeWidth={2} name="Resolved" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* status donut */}
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-bold text-slate-700">Status breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* category bars */}
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-bold text-slate-700">Issues by category</h3>
          <ResponsiveContainer width="100%" height={Math.max(200, stats.byCategory.length * 26)}>
            <BarChart data={stats.byCategory} layout="vertical" margin={{ left: 30, right: 16 }}>
              <XAxis type="number" hide /><YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(l) => l.split(' ')[0]} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {stats.byCategory.map((c, i) => <Cell key={i} fill={CATEGORY_UI[c.category as keyof typeof CATEGORY_UI]?.color || '#6366f1'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* ward breakdown */}
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-bold text-slate-700">Ward leaderboard (open issues)</h3>
          <div className="space-y-2">
            {stats.byWard.map((w) => {
              const max = Math.max(...stats.byWard.map((x) => x.count), 1);
              return (
                <div key={w.ward}>
                  <div className="flex justify-between text-xs"><span className="font-semibold text-slate-600">{w.ward}</span><span className="text-slate-400">{w.open} open / {w.count} total</span></div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-400" style={{ width: `${(w.count / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Predictive insights (Gemini) */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50">
        <div className="flex items-center gap-2 border-b border-violet-200/60 px-4 py-3">
          <Sparkles size={18} className="text-violet-600" />
          <h3 className="font-bold text-slate-800">AI Predictive Insights</h3>
          {insights && <GeminiBadge source={insights.source} />}
          <span className="ml-auto text-xs font-medium text-slate-500">for city authorities</span>
        </div>
        <div className="p-4">
          {loadingIns ? <div className="grid place-items-center py-8"><Spinner label="Gemini is forecasting hotspots…" /></div> : insights && (
            <>
              <p className="mb-3 font-semibold text-slate-700">{insights.headline}</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-rose-600"><AlertTriangle size={15} /> Predicted hotspots</div>
                  <div className="space-y-2">
                    {insights.hotspots.map((h, i) => (
                      <div key={i} className="rounded-xl bg-white p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{h.ward} · {h.category}</span>
                          <span className={cls('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', h.risk === 'high' ? 'bg-rose-100 text-rose-700' : h.risk === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>{h.risk}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">{h.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-emerald-600"><Lightbulb size={15} /> Recommended actions</div>
                  <ul className="space-y-2">
                    {insights.recommendations.map((r, i) => (
                      <li key={i} className="flex gap-2 rounded-xl bg-white p-3 text-sm text-slate-600 shadow-sm">
                        <span className="font-bold text-emerald-500">{i + 1}.</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: any; sub?: string; tone: string }) {
  const tones: Record<string, string> = { brand: 'from-brand-500 to-indigo-400', emerald: 'from-emerald-500 to-teal-400', amber: 'from-amber-500 to-orange-400', violet: 'from-violet-500 to-purple-400' };
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-3 p-4">
        <div className={cls('grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white', tones[tone])}>{icon}</div>
        <div className="min-w-0">
          <div className="text-2xl font-extrabold leading-none text-slate-800">{value}</div>
          <div className="truncate text-xs font-medium text-slate-500">{label}</div>
          {sub && <div className="truncate text-[10px] text-slate-400">{sub}</div>}
        </div>
      </div>
    </Card>
  );
}
