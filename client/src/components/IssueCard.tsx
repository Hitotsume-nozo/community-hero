import { useNavigate } from 'react-router-dom';
import { ThumbsUp, MessageSquare, MapPin } from 'lucide-react';
import { Issue } from '../lib/api';
import { CATEGORY_UI, timeAgo, cls } from '../lib/ui';
import { StatusBadge, SeverityPill, GeminiBadge } from './atoms';

export function IssueCard({ issue, onClick }: { issue: Issue; onClick?: () => void }) {
  const navigate = useNavigate();
  const cat = CATEGORY_UI[issue.category];
  return (
    <button
      onClick={onClick || (() => navigate(`/issue/${issue.id}`))}
      className="group w-full rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-brand-300 hover:shadow-md"
    >
      <div className="flex gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl" style={{ background: cat.color + '1a' }}>
          {issue.photoUrl
            ? <img src={issue.photoUrl} className="h-12 w-12 rounded-xl object-cover" alt="" />
            : <span>{cat.emoji}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-[15px] font-bold text-slate-800 group-hover:text-brand-700">{issue.title}</h3>
            <SeverityPill severity={issue.severity} />
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
            <MapPin size={12} /> <span className="truncate">{issue.ward} · {timeAgo(issue.createdAt)}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={issue.status} />
            <GeminiBadge source={issue.ai.source} />
            <span className={cls('ml-auto flex items-center gap-2 text-xs font-medium text-slate-500')}>
              <span className="flex items-center gap-1"><ThumbsUp size={13} />{issue.upvotes.length}</span>
              <span className="flex items-center gap-1"><MessageSquare size={13} />{issue.comments.length}</span>
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
