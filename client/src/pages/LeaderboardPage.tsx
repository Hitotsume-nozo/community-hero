import { useEffect, useState } from 'react';
import { Trophy, Flame, Medal } from 'lucide-react';
import { api, User } from '../lib/api';
import { useApp } from '../lib/store';
import { Avatar, Card, Spinner } from '../components/atoms';
import { cls } from '../lib/ui';

export default function LeaderboardPage() {
  const { user, config } = useApp();
  const [board, setBoard] = useState<(User & { rank: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.leaderboard().then(setBoard).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="grid h-full place-items-center"><Spinner label="Loading heroes…" /></div>;

  const me = board.find((b) => b.id === user?.id);
  const medal = ['🥇', '🥈', '🥉'];

  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto px-4 pb-24 pt-4">
      <div className="flex items-center gap-2"><Trophy className="text-amber-500" /><h1 className="text-2xl font-extrabold">Community Heroes</h1></div>
      <p className="mb-5 text-sm text-slate-500">Earn points for reporting, confirming and resolving issues. Climb the ranks and unlock badges. 🦸</p>

      {/* your rank */}
      {user && me && (
        <Card className="mb-5 overflow-hidden">
          <div className="flex items-center gap-3 bg-gradient-to-r from-brand-600 to-emerald-500 p-4 text-white">
            <div className="text-2xl font-black">#{me.rank}</div>
            <Avatar name={user.name} color={user.avatarColor} size={44} />
            <div className="flex-1">
              <div className="font-bold">{user.name} — that’s you!</div>
              <div className="text-sm text-white/90">{me.points} pts · {me.level?.name}</div>
            </div>
            <div className="text-right">
              {me.level?.next && <div className="text-xs text-white/80">{me.level.next.min - me.points} pts → {me.level.next.name}</div>}
              <div className="mt-1 h-2 w-28 overflow-hidden rounded-full bg-white/30">
                <div className="h-full rounded-full bg-white" style={{ width: `${me.level?.next ? Math.min(100, ((me.points - me.level.min) / (me.level.next.min - me.level.min)) * 100) : 100}%` }} />
              </div>
            </div>
          </div>
          {me.badges.length > 0 && <div className="flex flex-wrap gap-1.5 p-3">{me.badges.map((b) => <span key={b} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{b}</span>)}</div>}
        </Card>
      )}

      {/* levels legend */}
      <div className="mb-5 flex flex-wrap gap-2">
        {config?.levels.map((l) => (
          <span key={l.level} className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
            <Medal size={13} className="text-amber-500" /> L{l.level} {l.name} <span className="text-slate-400">· {l.min}+</span>
          </span>
        ))}
      </div>

      {/* board */}
      <div className="space-y-2">
        {board.map((u) => (
          <div key={u.id} className={cls('flex items-center gap-3 rounded-2xl border p-3', u.id === user?.id ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-white')}>
            <div className="w-8 text-center text-lg font-black text-slate-400">{u.rank <= 3 ? medal[u.rank - 1] : u.rank}</div>
            <Avatar name={u.name} color={u.avatarColor} size={40} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold text-slate-800">{u.name}</div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold">{u.level?.name}</span>
                {u.badges.slice(0, 3).map((b) => <span key={b}>{b.split(' ')[0]}</span>)}
              </div>
            </div>
            <div className="flex items-center gap-1 text-right">
              <Flame size={15} className="text-orange-500" />
              <span className="text-lg font-extrabold text-slate-800">{u.points}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
