import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight, MapPin } from 'lucide-react';
import { useApp } from '../lib/store';

export function Onboarding() {
  const { login, toast } = useApp();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function go(asAuthority = false) {
    if (!asAuthority && !name.trim()) return;
    setBusy(true);
    try {
      const u = await login(asAuthority ? 'BBMP Control Room' : name.trim(), asAuthority);
      toast(`Welcome, ${u.name}! 🎉`, 'success');
    } catch (e: any) {
      toast(e.message || 'Could not sign in', 'error');
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[1500] grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="bg-gradient-to-br from-brand-600 to-emerald-500 p-6 text-white">
          <div className="flex items-center gap-2 text-sm font-semibold opacity-90"><MapPin size={16} /> Bengaluru · Hyperlocal</div>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight">Community Hero</h1>
          <p className="mt-1 text-sm text-white/90">Report a pothole, leak or hazard in seconds. Our AI categorises it, your neighbours verify it, and authorities resolve it — transparently.</p>
        </div>
        <div className="space-y-3 p-6">
          <label className="block text-sm font-semibold text-slate-700">Your name (or a nickname)</label>
          <input
            autoFocus value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && go()}
            placeholder="e.g. Aarav Sharma"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-[15px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <button onClick={() => go()} disabled={busy || !name.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50">
            Enter as Citizen <ArrowRight size={18} />
          </button>
          <div className="flex items-center gap-3 py-1 text-xs text-slate-400">
            <div className="h-px flex-1 bg-slate-200" /> or <div className="h-px flex-1 bg-slate-200" />
          </div>
          <button onClick={() => go(true)} disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 py-3 font-semibold text-teal-700 transition hover:bg-teal-100">
            <ShieldCheck size={18} /> Enter as Authority (demo console)
          </button>
          <p className="pt-1 text-center text-[11px] text-slate-400">No password needed — this is a hackathon demo. Your handle just tracks your civic points.</p>
        </div>
      </motion.div>
    </div>
  );
}
