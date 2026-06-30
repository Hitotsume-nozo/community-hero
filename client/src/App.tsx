import { Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom';
import { Map, PlusCircle, BarChart3, Trophy, ShieldCheck, Sparkles } from 'lucide-react';
import { useApp } from './lib/store';
import { cls } from './lib/ui';
import { Avatar, Toasts } from './components/atoms';
import { Onboarding } from './components/Onboarding';
import { AssistantWidget } from './components/AssistantWidget';
import MapPage from './pages/MapPage';
import ReportPage from './pages/ReportPage';
import IssuePage from './pages/IssuePage';
import DashboardPage from './pages/DashboardPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AuthorityPage from './pages/AuthorityPage';

const NAV = [
  { to: '/', label: 'Map', icon: Map, end: true },
  { to: '/report', label: 'Report', icon: PlusCircle },
  { to: '/dashboard', label: 'Impact', icon: BarChart3 },
  { to: '/leaderboard', label: 'Heroes', icon: Trophy },
];

export default function App() {
  const { user, config, logout } = useApp();
  const navigate = useNavigate();
  const isAuthority = user?.role === 'authority';

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="z-[1100] shrink-0 border-b border-slate-200 bg-white/90 glass">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-3 sm:px-5">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <img src="/favicon.svg" className="h-7 w-7" alt="" />
            <span className="hidden text-[17px] font-extrabold tracking-tight sm:block">Community<span className="text-brand-600">Hero</span></span>
          </button>

          <nav className="ml-2 hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) => cls('flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition', isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100')}>
                <n.icon size={17} /> {n.label}
              </NavLink>
            ))}
            {isAuthority && (
              <NavLink to="/authority" className={({ isActive }) => cls('flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition', isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100')}>
                <ShieldCheck size={17} /> Console
              </NavLink>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {config && (
              <span className="hidden items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white sm:flex" title={`Gemini model: ${config.model}`}>
                <Sparkles size={12} className={config.geminiEnabled ? 'text-amber-300' : 'text-slate-400'} />
                {config.geminiEnabled ? 'Gemini AI live' : 'AI fallback'}
              </span>
            )}
            {user && (
              <button onClick={logout} className="flex items-center gap-2" title="Tap to switch user">
                <div className="hidden text-right sm:block">
                  <div className="text-xs font-bold leading-tight">{user.name}</div>
                  <div className="text-[10px] leading-tight text-slate-500">{isAuthority ? 'Authority' : `${user.points} pts · ${user.level?.name}`}</div>
                </div>
                <Avatar name={user.name} color={user.avatarColor} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="relative min-h-0 flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/issue/:id" element={<IssuePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/authority" element={isAuthority ? <AuthorityPage /> : <Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      {/* Mobile bottom nav */}
      <nav className="z-[1100] flex shrink-0 items-stretch justify-around border-t border-slate-200 bg-white md:hidden">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) => cls('flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium', isActive ? 'text-brand-600' : 'text-slate-500')}>
            <n.icon size={20} /> {n.label}
          </NavLink>
        ))}
      </nav>

      {!user && <Onboarding />}
      {user && <AssistantWidget />}
      <Toasts />
    </div>
  );
}
