import { ReactNode } from 'react';
import { Status } from '../lib/api';
import { STATUS_UI, severityColor, severityLabel, initials, cls } from '../lib/ui';
import { useApp } from '../lib/store';

export function StatusBadge({ status, size = 'sm' }: { status: Status; size?: 'sm' | 'md' }) {
  const s = STATUS_UI[status];
  return (
    <span
      className={cls('inline-flex items-center gap-1.5 rounded-full font-semibold', size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm')}
      style={{ color: s.color, background: s.bg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

export function SeverityPill({ severity }: { severity: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ background: severityColor(severity) }}>
      ⚑ {severityLabel(severity)}
    </span>
  );
}

export function Avatar({ name, color, size = 32 }: { name: string; color?: string; size?: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: color || '#6366f1', fontSize: size * 0.38 }}
    >
      {initials(name)}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cls('rounded-2xl border border-slate-200/70 bg-white shadow-sm', className)}>{children}</div>;
}

export function Pill({ children, active, onClick, color }: { children: ReactNode; active?: boolean; onClick?: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={cls('whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition', active ? 'border-transparent text-white shadow' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}
      style={active ? { background: color || '#4f46e5' } : undefined}
    >
      {children}
    </button>
  );
}

export function GeminiBadge({ source }: { source: 'gemini' | 'fallback' | string }) {
  const isG = source === 'gemini';
  return (
    <span
      className={cls('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', isG ? 'text-white' : 'bg-slate-100 text-slate-500')}
      style={isG ? { background: 'linear-gradient(90deg,#4285F4,#9b72cb,#d96570)' } : undefined}
      title={isG ? 'Analyzed live by Google Gemini' : 'Heuristic fallback (no AI key / offline)'}
    >
      ✦ {isG ? 'Gemini' : 'Heuristic'}
    </span>
  );
}

export function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[2000] flex flex-col items-center gap-2 px-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cls('animate-in pointer-events-auto rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg',
            t.kind === 'success' ? 'bg-emerald-600' : t.kind === 'error' ? 'bg-rose-600' : 'bg-slate-800')}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
